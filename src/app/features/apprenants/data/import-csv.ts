import { sansAccents } from '../../../shared/ui/data-table/data-table';
import { Sexe } from './apprenants.service';

/** Champs d'une ligne d'import (noms attendus par `importer_apprenants`). */
export type ChampImport = 'nom' | 'prenom' | 'sexe' | 'date_naissance' | 'classe' | 'ligne';

/** Ligne prête à être envoyée à la base (valeurs normalisées) ; `numero` = ligne du fichier, en-tête compris. */
export interface LigneImport {
    readonly numero: number;
    readonly nom: string;
    readonly prenom: string;
    readonly sexe: Sexe | null;
    readonly date_naissance: string | null;
    readonly classe: string | null;
    /** Valeurs lues dans le fichier, pour les messages d'erreur. */
    readonly brut: Readonly<Record<Exclude<ChampImport, 'ligne'>, string>>;
}

/** Erreur d'une ligne : clé `import.erreurs.<champ>_<code>`, valeur citée dans le message. */
export interface ErreurImport {
    readonly numero: number;
    readonly champ: ChampImport;
    readonly code: string;
    readonly valeur: string;
}

/** Erreur qui empêche toute analyse ligne par ligne (fichier vide, colonnes manquantes…). */
export interface ErreurFichier {
    readonly cle: string;
    readonly params?: Readonly<Record<string, string | number>>;
}

export interface AnalyseImport {
    readonly lignes: readonly LigneImport[];
    readonly erreurs: readonly ErreurImport[];
    readonly fatale: ErreurFichier | null;
}

export const MAX_LIGNES_IMPORT = 500;
export const TAILLE_MAX_IMPORT = 1024 * 1024;

const ENTETES: Readonly<Record<Exclude<ChampImport, 'ligne'>, readonly string[]>> = {
    nom: ['nom', 'nomdefamille', 'lastname', 'surname', 'familyname'],
    prenom: ['prenom', 'prenoms', 'firstname', 'givenname'],
    sexe: ['sexe', 'genre', 'sex', 'gender'],
    date_naissance: ['datedenaissance', 'datenaissance', 'naissance', 'dateofbirth', 'birthdate', 'dob'],
    classe: ['classe', 'class'],
};
const OBLIGATOIRES = ['nom', 'prenom', 'sexe'] as const;
const GARCON = new Set(['g', 'garcon', 'm', 'masculin', 'h', 'homme', 'b', 'boy', 'male']);
const FILLE = new Set(['f', 'fille', 'feminin', 'femme', 'girl', 'female']);

/** En-têtes du modèle téléchargeable, dans la langue de l'interface. */
const MODELE: Readonly<Record<'fr' | 'en', string>> = {
    fr: 'Nom;Prénom;Sexe;Date de naissance;Classe',
    en: 'Last name;First name;Sex;Date of birth;Class',
};

/** Modèle CSV (BOM pour Excel, point-virgule : séparateur d'Excel en français). */
export function modeleCsv(langue: string): Blob {
    return new Blob(['\uFEFF' + MODELE[langue === 'en' ? 'en' : 'fr'] + '\r\n'], { type: 'text/csv;charset=utf-8' });
}

/** Texte du fichier : UTF-8, sinon Windows-1252 (« CSV » simple d'Excel sous Windows). */
export async function lireFichier(fichier: Blob): Promise<string> {
    const octets = await fichier.arrayBuffer();
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(octets);
    } catch {
        return new TextDecoder('windows-1252').decode(octets);
    }
}

/** Découpe un CSV (guillemets, `""`, retours à la ligne dans un champ) ; chaque ligne garde son numéro de début. */
export function decouperCsv(texte: string, separateur: string): { numero: number; cellules: string[] }[] {
    const lignes: { numero: number; cellules: string[] }[] = [];
    let cellules: string[] = [];
    let cellule = '';
    let guillemets = false;
    let numero = 1;
    let debut = 1;
    for (let i = 0; i < texte.length; i++) {
        const c = texte[i];
        if (guillemets) {
            if (c === '"' && texte[i + 1] === '"') {
                cellule += '"';
                i++;
            } else if (c === '"') {
                guillemets = false;
            } else {
                if (c === '\n') {
                    numero++;
                }
                cellule += c;
            }
        } else if (c === '"' && cellule.trim() === '') {
            guillemets = true;
            cellule = '';
        } else if (c === separateur) {
            cellules.push(cellule);
            cellule = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && texte[i + 1] === '\n') {
                i++;
            }
            cellules.push(cellule);
            lignes.push({ numero: debut, cellules });
            cellules = [];
            cellule = '';
            numero++;
            debut = numero;
        } else {
            cellule += c;
        }
    }
    if (cellule !== '' || cellules.length > 0) {
        cellules.push(cellule);
        lignes.push({ numero: debut, cellules });
    }
    return lignes;
}

function separateurDe(entete: string): string {
    const compte = (s: string) => entete.split(s).length;
    return [';', ',', '\t'].reduce((a, b) => (compte(b) > compte(a) ? b : a));
}

const cleEntete = (s: string) => sansAccents(s).replace(/[^a-z]/g, '');
const texte = (s: string | undefined) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

/** Date JJ/MM/AAAA (ou J/M/AAAA, séparateurs / . -) ou AAAA-MM-JJ → ISO ; null si invalide, avant 1950 ou future. */
export function dateIso(valeur: string, aujourdhui = new Date()): string | null {
    const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(valeur);
    const iso8601 = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(valeur);
    const m = fr ?? iso8601;
    const [a, mo, j] = fr ? [+fr[3], +fr[2], +fr[1]] : iso8601 ? [+iso8601[1], +iso8601[2], +iso8601[3]] : [0, 0, 0];
    const d = new Date(Date.UTC(a, mo - 1, j));
    if (!m || d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) {
        return null;
    }
    const iso = d.toISOString().slice(0, 10);
    const max = new Date(Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())).toISOString().slice(0, 10);
    return iso < '1950-01-01' || iso > max ? null : iso;
}

/** Garçon / Fille (et équivalents courts ou anglais), sans casse ni accents. */
export function sexeDe(valeur: string): Sexe | null {
    const v = cleEntete(valeur);
    return GARCON.has(v) ? 'M' : FILLE.has(v) ? 'F' : null;
}

/** Analyse le fichier : colonnes reconnues par leur nom, lignes vides ignorées, erreurs de forme par ligne. */
export function analyserCsv(contenu: string): AnalyseImport {
    const sans = (fatale: ErreurFichier): AnalyseImport => ({ lignes: [], erreurs: [], fatale });
    const premiere = contenu.split(/\r?\n/, 1)[0] ?? '';
    const lignes = decouperCsv(contenu, separateurDe(premiere)).filter((l) => l.cellules.some((c) => c.trim() !== ''));
    if (lignes.length === 0) {
        return sans({ cle: 'import.fatal.vide' });
    }
    const [entete, ...donnees] = lignes;
    const colonnes = entete.cellules.map(cleEntete);
    const index = Object.fromEntries(
        (Object.keys(ENTETES) as (keyof typeof ENTETES)[]).map((champ) => [champ, colonnes.findIndex((c) => ENTETES[champ].includes(c))]),
    ) as Record<keyof typeof ENTETES, number>;
    const manquantes = OBLIGATOIRES.filter((c) => index[c] < 0);
    if (manquantes.length > 0) {
        return sans({ cle: 'import.fatal.colonnes', params: { colonnes: manquantes.join(',') } });
    }
    if (donnees.length === 0) {
        return sans({ cle: 'import.fatal.vide' });
    }
    if (donnees.length > MAX_LIGNES_IMPORT) {
        return sans({ cle: 'import.fatal.trop_de_lignes', params: { n: donnees.length } });
    }

    const erreurs: ErreurImport[] = [];
    const resultat = donnees.map(({ numero, cellules }): LigneImport => {
        const lire = (champ: keyof typeof ENTETES) => texte(index[champ] < 0 ? '' : cellules[index[champ]]);
        const brut = { nom: lire('nom'), prenom: lire('prenom'), sexe: lire('sexe'), date_naissance: lire('date_naissance'), classe: lire('classe') };
        const erreur = (champ: ChampImport, code: string) => erreurs.push({ numero, champ, code, valeur: champ === 'ligne' ? '' : brut[champ] });
        for (const champ of ['nom', 'prenom'] as const) {
            if (brut[champ] === '') {
                erreur(champ, 'requis');
            } else if (brut[champ].length > 100) {
                erreur(champ, 'invalide');
            }
        }
        const sexe = brut.sexe === '' ? null : sexeDe(brut.sexe);
        if (brut.sexe === '') {
            erreur('sexe', 'requis');
        } else if (!sexe) {
            erreur('sexe', 'invalide');
        }
        const date = brut.date_naissance === '' ? null : dateIso(brut.date_naissance);
        if (brut.date_naissance !== '' && !date) {
            erreur('date_naissance', 'invalide');
        }
        return { numero, nom: brut.nom, prenom: brut.prenom, sexe, date_naissance: date, classe: brut.classe || null, brut };
    });
    return { lignes: resultat, erreurs, fatale: null };
}
