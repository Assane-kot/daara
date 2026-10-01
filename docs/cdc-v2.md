# Cahier des charges V2 — DAARA SaaS (à compléter)

## Vision
Logiciel SaaS de gestion complète des daaras : chaque daara dispose de son espace, administré par un
admin, avec enseignants, parents et apprenants. Mise à jour en temps réel entre profils.

## Profils
| Rôle | Périmètre |
|---|---|
| Super-admin (plateforme) | Toutes les daaras, offres, facturation |
| Admin daara | Configuration, membres, classes, matières, années, bulletins |
| Enseignant | Ses classes/matières : absences, notes, suivi Coran, récitations |
| Parent | Lecture : absences, notes, bulletins, progression Coran de ses enfants |
| Apprenant | Son cahier, ses récitations, ses résultats |

## Modèle économique (à décider)
Le payeur est la daara ; parents et apprenants gratuits. Offres envisagées : Free (petite structure,
limité), Standard, Pro. Critères de différenciation : nb d'apprenants, rapports, SMS/WhatsApp, API.
(Multi-enseignants inclus dans toutes les offres.)

## Points ouverts
- [ ] Algorithme nafar (docs/nafar.md)
- [ ] Système de notation (sur 10, 20, appréciations ?) et calcul des moyennes
- [ ] Format des bulletins
- [ ] Canal de notification parents (SMS, WhatsApp, push)
- [ ] Connexion par téléphone (OTP) vs email
- [ ] Prix des offres
- [ ] Conformité données personnelles (CDP Sénégal), données de mineurs

## Référence
Ancienne version mobile (Firebase) : docs/cdc-v1-mobile.md — fonctionnalités Coran réutilisables
(cahier 114 sourates, cycle récitation/correction, devoirs).
