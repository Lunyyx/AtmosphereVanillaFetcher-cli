# 🌌 AtmosphereVanillaFetcher

Petit programme permettant de télécharger un pack des toutes dernières mises à jours d'Atmosphere avec quelques homebrews en plus.

# 🤔 Comment utiliser ce programme ?

Le programme est automatique, c'est-à-dire qu'il ne nécessite aucune action de votre part pendant son fonctionnement.

Afin d'éviter la limite de requêtes de l'API GitHub, vous devez utiliser votre token de compte afin de pouvoir utiliser ce programme. (Une version sans token arrivera peut-être dans le futur) 

## 🐱 Obtenir mon token GitHub

1. Connectez-vous à votre compte GitHub

2. Cliquez sur votre photo de profil en haut à droite, et cliquez sur **Settings**

3. Allez dans le menu **Developper settings**, puis **Personnal access tokens**

4. Cliquez sur **Generate new tokens**

5. Entrez une note pour vous rappeler de l'utilité du token, vous n'avez besoin d'aucune permission particulière, il n'est donc pas nécessaire de toucher aux permissions

6. Cliquez sur **Generate token**

7. Copiez ce token à un endroit où vous pourrez le retrouver afin de pouvoir l'utiliser pour le programme

Vous avez désormais votre token, vous pouvez passer à la suite !

## 📚 Paramétrer et utiliser le programme

1. Téléchargez le ZIP du projet et décompressez-le à l'endroit de votre choix

2. Ouvrez un terminal dans le dossier du projet<br>
(Sur Windows, vous pouvez faire **Shift+Clic droit** puis **Ouvrir la fenêtre PowerShell ici**, ou alors naviguer manuellement depuis un terminal)

3. Entrez cette commande pour initialiser le projet:
```
npm install
```

4. Créez un fichier **.env** à la racine du programme, avec le contenu suivant:
```
GITHUB_TOKEN=votre_token_ici
```
(Remplacez évidemment **votre_token_ici** par votre token GitHub.)

5. Exécutez le programme avec la commande suivante:
```
node index
```
Si tout se passe bien, le programme devrait télécharger les fichiers, les organiser et les compresser dans un fichier nommé **pack.zip** qui sera présent à la racine du programme.

Si vous avez le moindre problème, merci de le signaler ici: https://github.com/Lunyyx/AtmosphereVanillaFetcher/issues<br>
(Si des utilisateurs ou développeurs veulent clarifier mes propos, n'hésitez surtout pas)

# 🌌 AtmosphereVanillaFetcher

Small program to download a pack of the latest Atmosphere updates with some extra homebrews.

# 🤔 How to use this program?

The program is automatic, meaning that it does not require any action from you while it is running.
In order to avoid the GitHub API request limit, you must use your account token in order to use this program. (A version without token may come in the future) 

## 🐱 Getting my GitHub token

1. Login to your GitHub account

2. Click on your profile picture in the top right corner, and click on **Settings**

3. Go to the **Developer settings** menu, then **Personal access tokens**

4. Click on **Generate new tokens**.

5. Enter a note to remind you of the purpose of the token, you don't need any particular permission, so it is not necessary to touch the permissions

6. Click on **Generate token**

7. Copy this token to a location where you can find it and use it for the program

You now have your token, you can move on!

## 📚 Set up and use the program

1. Download the ZIP of the project and unzip it to the location of your choice

2. Open a terminal in the project folder<br>
(On Windows, you can do **Shift+Right click** then **Open PowerShell window here**, or manually navigate from a terminal)

3. Enter this command to initialize the project:
```
npm install
```

4. Create a **.env** file at the root of the program, with the following contents:
```
GITHUB_TOKEN=your_token_here
```
(Obviously replace **your_token_here** with your GitHub token.)

5. Run the program with the following command:
```
node index
```
If everything goes well, the program should download the files, organize them and compress them into a file named **pack.zip** which will be present in the root of the program.

If you have any problems, please report them here: https://github.com/Lunyyx/AtmosphereVanillaFetcher/issues<br>
(If users or developers want to clarify what I said, please do not hesitate)
