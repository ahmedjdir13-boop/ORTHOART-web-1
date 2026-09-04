# Mon Site

Structure de départ pour le projet.

## Arborescence
```
mon-site/
├── index.html          → page d'accueil
├── pages/               → autres pages HTML
│   ├── about.html
│   └── contact.html
├── css/
│   └── style.css        → tous les styles
├── js/
│   ├── main.js           → logique générale (nav, formulaires...)
│   └── animations.js     → effets visuels (scroll, 3D, sfx...)
├── assets/
│   ├── images/
│   ├── fonts/
│   └── icons/
└── README.md
```

## Comment lancer le site en local
1. Ouvre le dossier entier dans VS Code (`File > Open Folder`)
2. Installe l'extension **Live Server**
3. Clic droit sur `index.html` → "Open with Live Server"

## Règles de base
- Noms de fichiers en minuscules avec tirets (`about-us.html`)
- Un fichier CSS/JS par responsabilité, pas tout entassé dans un seul
- Les images/polices vont dans `assets/`, jamais mélangées au code
