/** @type {import('tailwindcss').Config} */

/*
 * Charte DAARA (ADR-004, règles ui-vristo) : primaire vert #1a6b3c, secondaire or #C9A84C.
 * `primary` et `on-primary` passent par des variables CSS (src/styles.css) : en mode sombre, le vert
 * s'éclaircit (#4caf7a) pour rester lisible sur fond sombre, et le texte des boutons pleins devient foncé.
 * L'or ne sert jamais de couleur de texte sur fond clair (contraste 2,3) : fonds, bordures, accents.
 */
const primary = {
    DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
    light: '#e3f3e9',
    'dark-light': 'rgb(var(--color-primary) / 0.15)',
    50: '#effaf3',
    100: '#d8f2e1',
    200: '#b3e3c6',
    300: '#80cda2',
    400: '#4caf7a',
    500: '#2a915c',
    600: '#1d7848',
    700: '#1a6b3c',
    800: '#17532f',
    900: '#134428',
    950: '#0a2616',
};

const secondary = {
    DEFAULT: '#c9a84c',
    light: '#f7f0dc',
    'dark-light': 'rgb(201 168 76 / 0.15)',
    50: '#fbf8ee',
    100: '#f5edd2',
    200: '#ebdaa5',
    300: '#dfc375',
    400: '#d4b25b',
    500: '#c9a84c',
    600: '#b08a35',
    700: '#8d6a2b',
    800: '#745628',
    900: '#614824',
    950: '#382711',
};

module.exports = {
    content: ['./src/**/*.{html,ts}'],
    darkMode: 'class',
    theme: {
        container: {
            center: true,
        },
        extend: {
            colors: {
                primary,
                secondary,
                accent: secondary,
                'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',
                success: {
                    DEFAULT: '#00ab55',
                    light: '#ddf5f0',
                    'dark-light': 'rgba(0,171,85,.15)',
                },
                danger: {
                    DEFAULT: '#e7515a',
                    light: '#fff5f5',
                    'dark-light': 'rgba(231,81,90,.15)',
                },
                warning: {
                    DEFAULT: '#e2a03f',
                    light: '#fff9ed',
                    'dark-light': 'rgba(226,160,63,.15)',
                },
                info: {
                    DEFAULT: '#2196f3',
                    light: '#e7f7ff',
                    'dark-light': 'rgba(33,150,243,.15)',
                },
                dark: {
                    DEFAULT: '#334039',
                    light: '#eaeceb',
                    'dark-light': 'rgba(51,64,57,.15)',
                },
                black: {
                    DEFAULT: '#0e1a14',
                    light: '#e3e6e4',
                    'dark-light': 'rgba(14,26,20,.15)',
                },
                white: {
                    DEFAULT: '#ffffff',
                    light: '#e0e6e2',
                    dark: '#8a978f',
                },
                // Fond de page clair et texte secondaire (remplacent #fafafa et #506690 de Vristo).
                page: '#fafafa',
                muted: '#5f6f66',
                // Mode sombre neutre teinté vert (remplace le bleu nuit de Vristo, voir ui-vristo.md).
                night: {
                    DEFAULT: '#121c16',
                    deep: '#0b120e',
                    input: '#16221b',
                    hover: '#1a261f',
                    raised: '#1d2a23',
                    border: '#22302a',
                    'border-strong': '#2c3d34',
                    muted: '#7d9488',
                },
            },
            fontFamily: {
                nunito: ['"Nunito Variable"', 'Nunito', 'sans-serif'],
            },
            fontSize: {
                // Taille de base DAARA : 15 px (Vristo : 14 px), pour la lecture sur téléphone.
                body: ['0.9375rem', '1.5rem'],
            },
            spacing: {
                4.5: '18px',
            },
            boxShadow: {
                '3xl': '0 2px 2px rgb(224 230 226 / 46%), 1px 6px 7px rgb(224 230 226 / 46%)',
            },
            typography: ({ theme }) => ({
                DEFAULT: {
                    css: {
                        '--tw-prose-invert-headings': theme('colors.white.dark'),
                        '--tw-prose-invert-links': theme('colors.white.dark'),
                        h1: {
                            fontSize: '40px',
                            marginBottom: '0.5rem',
                            marginTop: 0,
                        },
                        h2: {
                            fontSize: '32px',
                            marginBottom: '0.5rem',
                            marginTop: 0,
                        },
                        h3: {
                            fontSize: '28px',
                            marginBottom: '0.5rem',
                            marginTop: 0,
                        },
                        h4: {
                            fontSize: '24px',
                            marginBottom: '0.5rem',
                            marginTop: 0,
                        },
                        h5: {
                            fontSize: '20px',
                            marginBottom: '0.5rem',
                            marginTop: 0,
                        },
                        h6: {
                            fontSize: '16px',
                            marginBottom: '0.5rem',
                            marginTop: 0,
                        },
                        p: { marginBottom: '0.5rem' },
                        li: { margin: 0 },
                        img: { margin: 0 },
                    },
                },
            }),
        },
    },
    plugins: [
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
        require('@tailwindcss/typography'),
    ],
};
