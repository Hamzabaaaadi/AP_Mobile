# 🚌 Guide Débutant - Comment Tester l'Application de Suivi de Bus

## 🎯 Ce que vous allez faire
Vous allez lancer une application qui simule un système de suivi de bus en temps réel. Vous pourrez voir où sont les bus, quand ils arrivent aux arrêts, et combien de places sont disponibles.

## ⚠️ Important à savoir avant de commencer
- Cette application fonctionne UNIQUEMENT sur votre ordinateur (pas sur internet)
- Les bus et données sont simulés (ce ne sont pas de vrais bus)
- Vous n'avez besoin d'aucune connaissance technique !

## 📋 Ce dont vous avez besoin
- Un ordinateur Windows (que vous avez déjà)
- Une connexion internet (pour télécharger les outils)
- 30 minutes de votre temps

---

## 🚀 ÉTAPE 1 : Préparation des Outils

### 1.1 Installer Python
1. Allez sur : https://www.python.org/downloads/
2. Cliquez sur le gros bouton jaune "Download Python"
3. Une fois téléchargé, double-cliquez sur le fichier
4. **TRÈS IMPORTANT** : Cochez la case "Add Python to PATH" avant d'installer
5. Cliquez sur "Install Now"
6. Attendez la fin de l'installation

### 1.2 Installer Node.js
1. Allez sur : https://nodejs.org/
2. Cliquez sur le bouton vert "LTS" (version recommandée)
3. Une fois téléchargé, double-cliquez sur le fichier
4. Suivez l'installation en cliquant sur "Next" à chaque étape
5. Attendez la fin de l'installation

### 1.3 Redémarrer votre ordinateur
Redémarrez complètement votre ordinateur pour que tout fonctionne bien.

---

## 🏗️ ÉTAPE 2 : Lancer l'Application

### 2.1 Ouvrir PowerShell
1. Appuyez sur les touches `Windows + R` en même temps
2. Tapez `powershell` et appuyez sur Entrée
3. Une fenêtre bleue s'ouvre (c'est normal !)

### 2.2 Aller dans le bon dossier
Dans la fenêtre bleue, tapez exactement ceci et appuyez sur Entrée :
```
cd "d:\Casa_comp\bus-tracking-system"
```

### 2.3 Lancer l'application automatiquement
Tapez exactement ceci et appuyez sur Entrée :
```
.\start.bat
```

**Que va-t-il se passer ?**
- Plusieurs fenêtres vont s'ouvrir
- Du texte va défiler rapidement (c'est normal)
- Ça peut prendre 2-3 minutes la première fois
- Ne fermez aucune fenêtre qui s'ouvre !

---

## 🧪 ÉTAPE 3 : Tester l'Application

### 3.1 Vérifier que tout fonctionne
Après quelques minutes, vous devriez voir dans PowerShell :
```
✓ Backend démarré sur http://127.0.0.1:5000
✓ Applications mobiles prêtes
```

### 3.2 Tester l'API du backend
1. Ouvrez votre navigateur internet (Chrome, Firefox, Edge...)
2. Tapez cette adresse : `http://127.0.0.1:5000/api/buses`
3. Vous devriez voir du texte avec des informations sur les bus

### 3.3 Comptes de test disponibles
Voici les comptes que vous pouvez utiliser pour tester :

**Chauffeurs de bus :**
- Email : `john.doe@buscompany.com` | Mot de passe : `password123`
- Email : `jane.smith@buscompany.com` | Mot de passe : `password123`

### 3.4 Tester différentes fonctions
Dans votre navigateur, essayez ces adresses :

**Voir tous les bus :**
`http://127.0.0.1:5000/api/buses`

**Voir tous les arrêts :**
`http://127.0.0.1:5000/api/stops`

**Voir les prédictions pour un arrêt :**
`http://127.0.0.1:5000/api/stops/1/predictions`

---

## 📱 ÉTAPE 4 : Simuler l'Application Mobile (Optionnel)

Si vous voulez voir comment les applications mobiles communiquent avec le serveur :

### 4.1 Installer Expo CLI
Dans PowerShell, tapez :
```
npm install -g expo-cli
```

### 4.2 Lancer l'application utilisateur
```
cd mobile-user
npm install
npm start
```

### 4.3 Lancer l'application chauffeur
Ouvrez un NOUVEAU PowerShell et tapez :
```
cd "d:\Casa_comp\bus-tracking-system\mobile-driver"
npm install
npm start
```

---

## ✅ ÉTAPE 5 : Que Regarder Pour Vérifier Que Ça Marche

### Signes que tout fonctionne bien :
1. **Dans PowerShell** : Vous voyez "Backend démarré sur http://127.0.0.1:5000"
2. **Dans le navigateur** : Les adresses montrent des données (pas d'erreur)
3. **Aucun message d'erreur rouge** dans PowerShell

### Si ça ne marche pas :
1. Vérifiez que Python et Node.js sont bien installés
2. Redémarrez PowerShell
3. Vérifiez que vous êtes dans le bon dossier
4. Relancez `.\start.bat`

---

## 🛑 ÉTAPE 6 : Arrêter l'Application

Quand vous avez fini de tester :

### Méthode simple
Double-cliquez sur le fichier `stop.bat` dans le dossier du projet.

### Méthode manuelle
Dans PowerShell, appuyez sur `Ctrl + C` pour arrêter.

---

## 🔍 Que Fait Cette Application ?

### Backend (Serveur)
- Simule un serveur qui gère les bus
- Stocke les positions des bus
- Calcule quand les bus arrivent aux arrêts
- Gère l'occupation des bus

### Application Utilisateur
- Permet de voir où sont les bus
- Montre quand le prochain bus arrive
- Indique combien de places sont libres

### Application Chauffeur
- Permet aux chauffeurs de se connecter
- Envoie la position du bus en temps réel
- Met à jour le nombre de passagers

---

## 🆘 Problèmes Courants et Solutions

### "Python n'est pas reconnu"
➡️ Réinstallez Python en cochant "Add Python to PATH"

### "npm n'est pas reconnu"
➡️ Réinstallez Node.js et redémarrez l'ordinateur

### "Permission denied" ou "Accès refusé"
➡️ Faites clic droit sur PowerShell et choisissez "Exécuter en tant qu'administrateur"

### L'application ne se lance pas
➡️ Vérifiez que vous êtes dans le bon dossier avec `cd "d:\Casa_comp\bus-tracking-system"`

### Le navigateur montre une erreur
➡️ Attendez 1-2 minutes que le serveur démarre complètement

---

## 🎉 Félicitations !

Si vous arrivez à voir des données dans votre navigateur, vous avez réussi à lancer votre première application de suivi de bus ! 

Cette application montre comment un système de transport intelligent pourrait fonctionner dans la vraie vie.

## 📞 Besoin d'Aide ?

Si vous rencontrez des problèmes :
1. Relisez les étapes calmement
2. Vérifiez que vous avez bien installé Python et Node.js
3. Redémarrez votre ordinateur si nécessaire
4. Essayez de relancer `.\start.bat`

**Bon test ! 🚌**
