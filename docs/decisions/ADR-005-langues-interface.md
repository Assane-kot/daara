# ADR-005 — Langues de l'interface

Statut : acceptée (sprint 0)

## Contexte
La conception initiale prévoyait une interface français + arabe avec bascule RTL. La prise en charge
complète du RTL alourdit chaque écran (vérification miroir, police arabe, tests) pour un gain faible en V1.

## Décision
- Interface en **français (par défaut) et anglais**, sans RTL en V1.
- Le markup garde les variantes Tailwind `ltr:` / `rtl:` reprises de Vristo, pour pouvoir ajouter
  l'arabe (puis le wolof) sans refonte.
- L'arabe reste présent **dans les données** : noms des sourates (`nom_ar`), contenus des bulletins
  franco-arabes. Une police arabe sera ajoutée pour ces contenus (`lang="ar"`) au sprint où ils
  apparaissent (bulletins sprint 7, Coran sprint 9).

## Conséquences
+ Moins de travail et de tests par écran ; Definition of Done allégée (plus de vérification RTL).
− L'ajout ultérieur de l'arabe en interface demandera une passe de vérification RTL sur tous les écrans.
