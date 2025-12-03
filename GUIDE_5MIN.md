# 🚌 GUIDE ULTRA-SIMPLE - Test en 5 Minutes

## 🚀 Pour les VRAIS débutants (jamais touché à la programmation)

### ÉTAPE 1 : Préparation (une seule fois)

#### 1.1 Installer Python
- Allez sur `https://www.python.org/downloads/`
- Cliquez sur le gros bouton jaune "Download Python"
- Double-cliquez sur le fichier téléchargé
- **COCHEZ IMPÉRATIVEMENT** "Add Python to PATH" ✅
- Cliquez "Install Now"

#### 1.2 Installer Node.js
- Allez sur `https://nodejs.org/`
- Cliquez sur "LTS" (bouton vert)
- Double-cliquez sur le fichier téléchargé
- Cliquez "Next" partout jusqu'à la fin

#### 1.3 Redémarrer l'ordinateur
OBLIGATOIRE ! Redémarrez votre PC maintenant.

---

### ÉTAPE 2 : Test automatique

#### 2.1 Ouvrir l'Explorateur de fichiers
- Appuyez sur `Windows + E`
- Naviguez vers `d:\Casa_comp\bus-tracking-system`

#### 2.2 Test de configuration
- Double-cliquez sur `test_automatique.bat`
- Lisez les messages qui s'affichent
- Si tout est vert/OK, passez à l'étape suivante

#### 2.3 Lancer l'application
- Double-cliquez sur `start.bat`
- Attendez 2-3 minutes (plusieurs fenêtres vont s'ouvrir)

---

### ÉTAPE 3 : Voir que ça marche

#### 3.1 Ouvrir votre navigateur
- Chrome, Firefox, ou Edge (peu importe)

#### 3.2 Taper cette adresse exactement :
```
http://127.0.0.1:5000/api/buses
```

#### 3.3 Vous devez voir quelque chose comme :
```
[{"id": 1, "number": "101", "route": "Centre-ville", ...}]
```

Si vous voyez du texte avec des bus, **FÉLICITATIONS !** Ça marche ! 🎉

---

### ÉTAPE 4 : Tester d'autres fonctions

#### Voir tous les arrêts :
```
http://127.0.0.1:5000/api/stops
```

#### Voir quand arrive le prochain bus à l'arrêt 1 :
```
http://127.0.0.1:5000/api/stops/1/predictions
```

---

### ÉTAPE 5 : Arrêter l'application

Quand vous avez fini :
- Double-cliquez sur `stop.bat`
- Ou fermez toutes les fenêtres noires

---

## ❌ Si ça ne marche pas

### Message "Python n'est pas reconnu"
➡️ Vous avez oublié de cocher "Add Python to PATH"
➡️ Réinstallez Python en cochant cette case

### Message "npm n'est pas reconnu"  
➡️ Redémarrez votre ordinateur après avoir installé Node.js

### "Accès refusé" ou "Permission denied"
➡️ Clic droit sur `test_automatique.bat` → "Exécuter en tant qu'administrateur"

### Le navigateur affiche "Cette page ne peut pas être affichée"
➡️ Attendez 1-2 minutes de plus que le serveur démarre
➡️ Vérifiez que les fenêtres noires sont toujours ouvertes

---

## 🎯 Qu'est-ce que vous testez exactement ?

Cette application simule :
- **Un serveur** qui gère les bus d'une ville
- **Des bus virtuels** qui se déplacent sur des routes
- **Des arrêts de bus** avec des horaires prédits
- **Une app pour les utilisateurs** (voir les bus)
- **Une app pour les chauffeurs** (envoyer sa position)

C'est exactement comme les vraies apps de transport (Citymapper, etc.) mais en plus simple !

---

## 🏆 Vous avez réussi si...

✅ Vous voyez des données JSON dans votre navigateur
✅ Aucun message d'erreur rouge dans les fenêtres
✅ L'adresse `http://127.0.0.1:5000/api/buses` montre des informations

**Bravo ! Vous venez de lancer votre premier système de transport intelligent ! 🚌**
