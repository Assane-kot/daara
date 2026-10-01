<#
.SYNOPSIS
    Restaure une sauvegarde de daara-prod dans le Supabase LOCAL, pour vérifier qu'elle est exploitable.

.DESCRIPTION
    Déchiffre l'archive (age), remet la base locale à zéro, restaure rôles, schéma et données, puis affiche
    un contrôle. Ne touche JAMAIS à un projet distant. Les fichiers déchiffrés (données personnelles de
    mineurs) sont supprimés à la fin, même en cas d'erreur.
    Prérequis : Docker Desktop, `npm run db:start`, age (`winget install FiloSottile.age`).
    Procédure complète : docs/deploiement.md §4.6.

.EXAMPLE
    .\scripts\restaurer-sauvegarde-locale.ps1 -Archive .\daara-prod-20261001-023000.tar.gz.age -CleAge D:\cles\daara-sauvegarde.txt

.EXAMPLE
    .\scripts\restaurer-sauvegarde-locale.ps1 -Dossier .\dump-dechiffre   # fichiers roles.sql, schema.sql, data.sql déjà déchiffrés
#>
[CmdletBinding(DefaultParameterSetName = 'Archive')]
param(
    [Parameter(Mandatory, ParameterSetName = 'Archive')] [string] $Archive,
    [Parameter(Mandatory, ParameterSetName = 'Archive')] [string] $CleAge,
    [Parameter(Mandatory, ParameterSetName = 'Dossier')] [string] $Dossier,
    [switch] $SansConfirmation
)

$ErrorActionPreference = 'Stop'
$conteneur = 'supabase_db_daara'
$travail = Join-Path ([IO.Path]::GetTempPath()) ("daara-restauration-" + [guid]::NewGuid())

function Invoke-Psql([string[]] $arguments) {
    & docker exec $conteneur psql -U postgres -d postgres @arguments
}

try {
    if ((& docker inspect -f '{{.State.Running}}' $conteneur 2>$null) -ne 'true') {
        throw "Supabase local arrêté : lancez 'npm run db:start' (Docker Desktop requis)."
    }

    New-Item -ItemType Directory -Path $travail | Out-Null
    if ($PSCmdlet.ParameterSetName -eq 'Archive') {
        if (-not (Get-Command age -ErrorAction SilentlyContinue)) { throw "age introuvable : winget install FiloSottile.age" }
        Write-Host '1. Déchiffrement'
        # Fichier intermédiaire plutôt qu'un pipe : PowerShell altère les flux binaires.
        & age -d -i $CleAge -o (Join-Path $travail 'sauvegarde.tar.gz') $Archive
        if ($LASTEXITCODE -ne 0) { throw 'Déchiffrement impossible (mauvaise clé ou archive corrompue).' }
        & tar -xzf (Join-Path $travail 'sauvegarde.tar.gz') -C $travail
        if ($LASTEXITCODE -ne 0) { throw 'Archive illisible.' }
    } else {
        Copy-Item (Join-Path $Dossier '*.sql') $travail
    }
    foreach ($f in 'roles.sql', 'schema.sql', 'data.sql') {
        if (-not (Test-Path (Join-Path $travail $f))) { throw "Fichier manquant dans la sauvegarde : $f" }
    }

    if (-not $SansConfirmation) {
        $reponse = Read-Host 'La base LOCALE va être remise à zéro avant restauration. Continuer ? (o/N)'
        if ($reponse -notmatch '^[oO]') { Write-Host 'Abandon.'; return }
    }

    Write-Host '2. Remise à zéro de la base locale'
    & npx supabase db reset | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'supabase db reset a échoué.' }

    Write-Host '3. Restauration'
    foreach ($f in 'roles.sql', 'schema.sql', 'data.sql') {
        & docker cp (Join-Path $travail $f) "${conteneur}:/tmp/$f" | Out-Null
    }
    # Rôles : réglages internes de Supabase déjà présents, certaines lignes échouent sans conséquence.
    # (PowerShell 5.1 transforme la sortie d'erreur redirigée d'une commande native en erreur bloquante.)
    $ErrorActionPreference = 'Continue'
    Invoke-Psql @('-q', '-f', '/tmp/roles.sql') 2>$null | Out-Null
    $ErrorActionPreference = 'Stop'
    Invoke-Psql @('-q', '--single-transaction', '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/schema.sql',
        '-c', 'SET session_replication_role = replica', '-f', '/tmp/data.sql') | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Restauration du schéma ou des données en échec : base locale incohérente, relancez npm run db:reset.' }

    Write-Host '4. Contrôle'
    Invoke-Psql @('-tAc', "select '   comptes : ' || count(*) from auth.users")
    Invoke-Psql @('-tAc', "select '   tables publiques : ' || count(*) || ', dont sans RLS : ' || count(*) filter (where not rowsecurity) from pg_tables where schemaname = 'public'")
    Write-Host 'Restauration réussie. Après vérification : npm run db:reset pour revenir à une base de développement.'
}
finally {
    & docker exec $conteneur rm -f /tmp/roles.sql /tmp/schema.sql /tmp/data.sql 2>$null | Out-Null
    if (Test-Path $travail) { Remove-Item -Recurse -Force $travail }
}
