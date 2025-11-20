# 🏢 Système de Gestion d'Ascenseur Multi-Étages

Application moderne de gestion d'ascenseur pour un appartement multi-étages, développée avec Next.js, Ant Design, Tailwind CSS et Prisma (MongoDB).

## 🚀 Technologies utilisées

- **Next.js 15** - Framework React avec App Router
- **Ant Design** - Bibliothèque de composants UI
- **Tailwind CSS** - Framework CSS utilitaire
- **Prisma** - ORM pour MongoDB
- **TypeScript** - Typage statique
- **MongoDB** - Base de données NoSQL

## 📋 Prérequis

- Node.js 18+ (recommandé 20+)
- MongoDB (local ou Atlas)
- Yarn

## 🛠️ Installation

1. **Installer les dépendances :**
   ```bash
   yarn install
   ```

2. **Configurer la base de données :**
   
   Créer un fichier `.env` à la racine du projet :
   ```env
   DATABASE_URL="mongodb://localhost:27017/dakard"
   ```
   
   Ou pour MongoDB Atlas :
   ```env
   DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/dakard?retryWrites=true&w=majority"
   ```

3. **Générer le client Prisma :**
   ```bash
   yarn prisma:generate
   ```

4. **Lancer le serveur de développement :**
   ```bash
   yarn dev
   ```

5. **Ouvrir dans le navigateur :**
   ```
   http://localhost:3000
   ```

## 📁 Structure du projet

```
dakard/
├── prisma/
│   └── schema.prisma          # Schéma de base de données
├── src/
│   ├── app/
│   │   ├── api/                      # Routes API
│   │   │   ├── building/             # Gestion du bâtiment
│   │   │   ├── elevator/             # Gestion des ascenseurs
│   │   │   └── request/              # Gestion des demandes
│   │   ├── layout.tsx                # Layout principal
│   │   ├── page.tsx                  # Page d'accueil
│   │   └── globals.css               # Styles globaux avec thème sombre
│   ├── components/
│   │   ├── AntdProvider.tsx          # Provider Ant Design
│   │   ├── ElevatorVisualization.tsx # Vue 3D de l'ascenseur
│   │   ├── ControlPanel.tsx          # Panneau de contrôle réaliste
│   │   └── RequestList.tsx           # Liste des demandes en temps réel
│   └── lib/
│       └── prisma.ts                 # Client Prisma singleton
└── package.json
```

## 🎯 Fonctionnalités

### ✨ Interface utilisateur
- **Vue 3D du bâtiment** : Visualisation en temps réel de l'ascenseur dans le bâtiment
- **Affichage LED numérique** : Indicateur d'étage style LED rouge avec effet lumineux
- **Indicateurs de direction** : Flèches lumineuses montant/descendant avec animations
- **Panneau de contrôle réaliste** : Boutons d'étage style véritable ascenseur
- **Appel téléphonique** : Fonction d'appel de l'ascenseur depuis n'importe quel étage
- **Liste des demandes en temps réel** : Suivi animé des demandes actives
- **Design moderne sombre** : Interface élégante avec thème sombre professionnel
- **Animations fluides** : Transitions et effets visuels pour une meilleure expérience

### 🔧 Fonctionnalités techniques
- **Gestion multi-ascenseurs** : Support de plusieurs ascenseurs par bâtiment
- **Assignation automatique** : L'ascenseur le plus proche est automatiquement assigné
- **Suivi en temps réel** : Mise à jour automatique toutes les 2 secondes
- **Gestion des priorités** : Système de priorité pour les demandes
- **Historique** : Suivi de toutes les demandes

## 📊 Modèles de données

### Building (Bâtiment)
- Nom du bâtiment
- Nombre total d'étages
- Relation avec les ascenseurs et demandes

### Elevator (Ascenseur)
- Nom de l'ascenseur
- Étage actuel
- Statut (idle, moving_up, moving_down, maintenance)
- Direction (up, down, null)

### Request (Demande)
- Étage de départ
- Étage de destination
- Statut (pending, assigned, in_progress, completed, cancelled)
- Priorité
- Relation avec l'ascenseur assigné

## 🎨 Interface

L'interface est divisée en plusieurs sections :

1. **En-tête** : Informations sur le bâtiment avec design sombre élégant
2. **Vue du bâtiment** : Visualisation en temps réel de l'ascenseur se déplaçant entre les étages
3. **Affichage LED** : Indicateur d'étage actuel style affichage numérique LED
4. **Indicateurs de direction** : Trois boutons lumineux (↑ Haut, ↓ Bas, ⏸ Arrêt)
5. **Panneau de contrôle** : Grille de boutons pour sélectionner l'étage depuis l'intérieur
6. **Bouton d'appel** : Fonction d'appel de l'ascenseur avec modal de sélection
7. **Liste des demandes** : Affichage en temps réel avec badges colorés et animations

## 🔄 Scripts disponibles

- `yarn dev` - Lancer le serveur de développement
- `yarn build` - Construire pour la production
- `yarn start` - Lancer le serveur de production
- `yarn lint` - Vérifier le code
- `yarn prisma:generate` - Générer le client Prisma
- `yarn prisma:migrate` - Créer une migration
- `yarn prisma:studio` - Ouvrir Prisma Studio

## 📝 Notes

- Le système crée automatiquement un bâtiment par défaut avec 10 étages et un ascenseur au premier lancement
- Les demandes sont assignées automatiquement à l'ascenseur le plus proche
- L'interface se met à jour automatiquement toutes les 3 secondes
- Le design sombre offre une meilleure expérience visuelle et réduit la fatigue oculaire
- Les animations et effets lumineux simulent un véritable système d'ascenseur

## 🐛 Dépannage

Si vous rencontrez des erreurs :

1. Vérifiez que MongoDB est en cours d'exécution
2. Vérifiez que le fichier `.env` contient la bonne `DATABASE_URL`
3. Exécutez `yarn prisma:generate` pour régénérer le client Prisma
4. Vérifiez les logs de la console pour plus d'informations

## 📄 Licence

Ce projet est un projet personnel.

