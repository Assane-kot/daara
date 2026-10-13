import { analyserCsv, dateIso, decouperCsv, lireFichier, modeleCsv, sexeDe } from './import-csv';

describe('import CSV des élèves', () => {
    it('découpe : guillemets, "" et retour à la ligne dans un champ, CRLF ; numéros de ligne du fichier', () => {
        expect(decouperCsv('a;"b;c"\r\n"d ""e""";"f\ng"\nh;i', ';')).toEqual([
            { numero: 1, cellules: ['a', 'b;c'] },
            { numero: 2, cellules: ['d "e"', 'f\ng'] },
            { numero: 4, cellules: ['h', 'i'] },
        ]);
    });

    it('dates : JJ/MM/AAAA, J.M.AAAA, AAAA-MM-JJ ; impossibles, avant 1950 ou futures refusées', () => {
        const ref = new Date(2026, 9, 10);
        expect(dateIso('15/03/2016', ref)).toBe('2016-03-15');
        expect(dateIso('5.3.2016', ref)).toBe('2016-03-05');
        expect(dateIso('2016-03-15', ref)).toBe('2016-03-15');
        expect(dateIso('31/02/2016', ref)).toBeNull();
        expect(dateIso('15/03/16', ref)).toBeNull();
        expect(dateIso('31/12/1949', ref)).toBeNull();
        expect(dateIso('11/10/2026', ref)).toBeNull();
        expect(dateIso('10/10/2026', ref)).toBe('2026-10-10');
    });

    it('sexe : Garçon / Fille et équivalents, sans casse ni accents', () => {
        expect(['Garçon', 'GARCON', 'g', 'M', 'Boy'].map(sexeDe)).toEqual(['M', 'M', 'M', 'M', 'M']);
        expect(['Fille', 'f', 'Féminin', 'girl'].map(sexeDe)).toEqual(['F', 'F', 'F', 'F']);
        expect(sexeDe('X')).toBeNull();
    });

    it('analyse : colonnes reconnues (ordre libre, accents, anglais), séparateur virgule, lignes vides ignorées', () => {
        const a = analyserCsv('First name,Last name,Sex,Class\n Awa , Ndiaye ,Girl,CE1 A\n\n,,,\nModou,Diop,boy,\n');
        expect(a.fatale).toBeNull();
        expect(a.erreurs).toEqual([]);
        expect(a.lignes.map((l) => [l.numero, l.prenom, l.nom, l.sexe, l.date_naissance, l.classe])).toEqual([
            [2, 'Awa', 'Ndiaye', 'F', null, 'CE1 A'],
            [5, 'Modou', 'Diop', 'M', null, null],
        ]);
    });

    it('analyse : erreurs par ligne avec la valeur lue', () => {
        const a = analyserCsv('Nom;Prénom;Sexe;Date de naissance\n;Awa;Fille;\nDiop;Ali;X;31/02/2016\n');
        expect(a.erreurs).toEqual([
            { numero: 2, champ: 'nom', code: 'requis', valeur: '' },
            { numero: 3, champ: 'sexe', code: 'invalide', valeur: 'X' },
            { numero: 3, champ: 'date_naissance', code: 'invalide', valeur: '31/02/2016' },
        ]);
    });

    it('analyse : fichier vide, colonnes manquantes, plus de 500 lignes', () => {
        expect(analyserCsv('').fatale?.cle).toBe('import.fatal.vide');
        expect(analyserCsv('Nom;Prénom;Sexe\n').fatale?.cle).toBe('import.fatal.vide');
        expect(analyserCsv('Nom;Classe\nDiop;CP').fatale).toEqual({ cle: 'import.fatal.colonnes', params: { colonnes: 'prenom,sexe' } });
        const gros = 'Nom;Prénom;Sexe\n' + 'Diop;Ali;M\n'.repeat(501);
        expect(analyserCsv(gros).fatale).toEqual({ cle: 'import.fatal.trop_de_lignes', params: { n: 501 } });
    });

    it('modèle : relu par l’analyse (en-têtes fr et en reconnus)', async () => {
        for (const langue of ['fr', 'en']) {
            const a = analyserCsv((await lireFichier(modeleCsv(langue))) + 'Ndiaye;Awa;Fille;15/03/2016;CE1 A\n');
            expect(a.fatale).toBeNull();
            expect(a.lignes[0]).toMatchObject({ nom: 'Ndiaye', prenom: 'Awa', sexe: 'F', date_naissance: '2016-03-15', classe: 'CE1 A' });
        }
    });

    it('lecture : fichier Windows-1252 (CSV simple d’Excel) relu avec ses accents', async () => {
        const octets = new Uint8Array([0x50, 0x72, 0xe9, 0x6e, 0x6f, 0x6d]); // « Prénom » en Windows-1252
        expect(await lireFichier(new Blob([octets]))).toBe('Prénom');
    });
});
