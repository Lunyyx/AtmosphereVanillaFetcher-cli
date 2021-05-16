const fetch = require('node-fetch');
const fs = require('fs-extra')
const Downloader = require('nodejs-file-downloader');
const StreamZip = require('node-stream-zip');
const cliProgress = require('cli-progress');
const chalk = require('chalk');
const { PythonShell } = require('python-shell');
const moment = require('moment');
const AdmZip = require('adm-zip');
require('dotenv').config();
moment.locale('fr');

const output_folder = './temp';
const final_folder = './SD';

console.log('Bienvenue sur AtmosphereVanillaFetcher.\nDéveloppé par Lunyx, avec la grande aide de Murasaki.\nRemerciements:\nZoria pour le script original.\nMurasaki pour l\'immense aide qu\'il a fourni pour ce projet.\n')

if(!fs.existsSync(output_folder)) {
    fs.mkdir(output_folder, function () {
        console.log('Dossier "temp" créé !');
    });
};

if(!fs.existsSync(final_folder)) {
    fs.mkdir(final_folder, function () {
        console.log('Dossier "SD" créé !');
    });
};

(async () => {
    async function getRelease(link, desiredFiles) {
        try {
            let release = await fetch(`https://api.github.com/repos/${link}/releases`, { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } });

            if (release.status === 404)
                return console.log(`https://api.github.com/repos/${link}/releases retourne une erreur 404.`);
            else if (release.headers.get('x-ratelimit-limit') == 60) {
                console.log(chalk.red('La clé d\'accès API GitHub est erronnée, veuillez en spécifier une de correcte dans le fichier .env.'));
                process.exit();
            } else if (release.headers.get('x-ratelimit-remaining') == 0) {
                console.log(chalk.red(`Vous avez dépassé le nombre de requêtes maximum par heure, vous devez attendre ${chalk.bold(moment(Number(release.headers.get('x-ratelimit-reset')) * 1000).format('ddd LL, LTS'))} avant de pouvoir réutiliser le programme.`));
                process.exit();
            };

            release = await release.json();
            release = release[0];

            let repoName = release.url.replace('https://api.github.com/repos', '').replace(`/releases/${release.id}`, '').split('/')[2];

            const { assets } = release;
            if (assets.length === 0)
                return console.log(`Il n'y a pas de fichiers sur la dernière version de ${repoName}.`);

            const desiredFilesArray = [];

            for (let asset of assets) {
                const { name, browser_download_url } = asset;
                for (let file of desiredFiles) {
                    const { exp, filename } = file;
                    if (exp.test(name) && name.replace(name.match(exp)[0], '') == '') {
                        desiredFilesArray.push({ name: filename, url: browser_download_url, version: release.tag_name });
                        break;
                    };
                };
            };

            return desiredFilesArray;
        } catch (error) {
            console.log(chalk.red(error));
        };
    };

    const desiredReleases = [{ link: 'CTCaer/hekate', desiredFiles: [{ exp: /^hekate_ctcaer_[0-9]*\.[0-9]+[0-9]*\.[0-9]+_[a-zA-Z]+_[0-9]*\.[0-9]+[0-9]*\.[0-9]+\.zip$/, filename: 'hekate.zip' }] }, { link: 'Atmosphere-NX/Atmosphere', desiredFiles: [{ exp: /^atmosphere-(\d(\.\d)+)(\d(\.\d)+)-[a-zA-Z]+-[0-9]+a[0-9]+d-WITHOUT_MESOSPHERE\+hbl-[0-9]*\.[0-9]+[0-9]*\.[0-9]+\+hbmenu-[0-9]*\.[0-9]+[0-9]*\.[0-9]+\.zip$/, filename: 'atmosphere.zip' }, { exp: /^fusee-primary\.bin$/, filename: 'fusee_primary.bin' }] }, { link: 'ITotalJustice/patches', desiredFiles: [{ exp: /^fusee\.zip$/, filename: 'fusee.zip' }] }, { link: 'Huntereb/Awoo-Installer', desiredFiles: [{ exp: /^Awoo-Installer\.zip$/, filename: 'awoo_installer.zip' }] }, { link: 'WerWolv/EdiZon', desiredFiles: [{ exp: /^EdiZon\.nro$/, filename: 'EdiZon.nro' }] }, { link: 'XorTroll/Goldleaf', desiredFiles: [{ exp: /^Goldleaf\.nro$/, filename: 'Goldleaf.nro' }] }, { link: 'SciresM/Checkpoint', desiredFiles: [{ exp: /^Checkpoint\.nro$/, filename: 'Checkpoint.nro' }] }, { link: 'J-D-K/JKSV', desiredFiles: [{ exp: /^JKSV\.nro$/, filename: 'JKSV.nro' }] }, { link: 'mtheall/ftpd', desiredFiles: [{ exp: /^ftpd\.nro$/, filename: 'ftpd.nro' }] }, { link: 'liuervehc/nxmtp', desiredFiles: [{ exp: /^nxmtp\.nro$/, filename: 'nxmtp.nro' }] }, { link: 'mrdude2478/TinWoo', desiredFiles: [{ exp: /^TinWoo-Installer\.zip$/, filename: 'TinWoo-Installer.zip' }] }, { link: 'meganukebmp/Switch_90DNS_tester', desiredFiles: [{ exp: /^Switch_90DNS_tester\.nro$/, filename: 'Switch_90DNS_tester.nro' }] }];

    let files = [];

    for (let desiredRelease of desiredReleases) {
        const { link, desiredFiles } = desiredRelease;
        let release = await getRelease(link, desiredFiles);
        files = files.concat(release);
    };

    files.push({ name: 'sxgear.zip', url: 'https://sx.xecuter.com/download/SX_Gear_v1.1.zip', version: 'v1.1' }, { name: 'tinfoil.zip', url: 'https://tinfoil.io/Home/Bounce/?url=https%3A%2F%2Ftinfoil.media%2Frepo%2Ftinfoil.latest.zip', version: 'v12.0' }, { name: 'hekate_ipl.ini', url: 'https://nobuyoshi.red/hekate_ipl.ini', version: 'latest' }, { name: 'exosphere.ini', url: 'https://nobuyoshi.red/exosphere.ini', version: 'latest' }, { name: 'sysmmc.txt', url: 'https://nobuyoshi.red/sysmmc.txt', version: 'latest' }, { name: 'emummc.txt', url: 'https://nobuyoshi.red/emummc.txt', version: 'latest' });

    console.log('Téléchargement des différents fichiers nécessaires au pack:');
    const filesLength = files.length;
    let downloadedFiles = 0;
    
    for (let file of files) {
        const { name, url, version } = file;
        let bar;
        
        let downloader = new Downloader({
            url: url,
            directory: output_folder,
            filename: name,
            cloneFiles: false,
            onBeforeSave:()=>{
                console.log(`\nDébut du téléchargement de: ${name} (${version})`);
                bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                bar.start(100, 0);
            },   
            onProgress: async function(percentage){
                await bar.update(Math.round(percentage));
            },        
        });
        
        try {
            await downloader.download();
            bar.stop();
            console.log(chalk.green(`Le fichier ${chalk.bold(name)} a été téléchargé avec succès.`));
            downloadedFiles++;
        } catch (error) {
            if (bar)
                bar.stop();
            console.log(chalk.red(`Le fichier ${chalk.bold(name)} n'a pas pu être téléchargé:\n${error}`));
        };
    };

    if (downloadedFiles === 0)
        console.log(chalk.bold.red(`\nAucun fichier n\'a été téléchargé.`));
    else if (downloadedFiles === filesLength)
        console.log(chalk.bold.green(`\nTous les fichiers ont été téléchargés.`));
    else
        console.log(chalk.bold.keyword('orange')(`\n${downloadedFiles}/${filesLength} fichiers ont été téléchargés.`));

    console.log('\nPréparation du dossier "SD"...');

    let zip_temp_files = await fs.readdir(output_folder).then(files => { return files.filter(f => f.endsWith('.zip')) });
    
    for (let zip of zip_temp_files) {
        const zip_file = new StreamZip.async({ file: `./temp/${zip}` });

        if(!fs.existsSync(`./temp/${zip.replace('.zip', '')}`))
            await fs.mkdir(`./temp/${zip.replace('.zip', '')}`);
        else {
            await fs.rm(`./temp/${zip.replace('.zip', '')}`, { recursive: true });
            await fs.mkdir(`./temp/${zip.replace('.zip', '')}`);
        };

        const count = await zip_file.extract(null, `./temp/${zip.replace('.zip', '')}`);
        console.log(`${chalk.bold(count)} fichier(s) extrait(s) de ${chalk.bold(zip)}`);
    };

    console.log('\nGénération du boot.dat modifié...');

    fs.rename('./temp/hekate/hekate_ctcaer_5.5.6.bin', './temp/hekate/hekate_ctcaer.bin', () => {
        console.log('Fichier hekate renommé en "hekate_ctcaer.bin".');
    });

    PythonShell.run('./python/tx_custom_boot.py', null, function (err) {
        if (err) throw chalk.red(err);
        console.log(chalk.bold.green('\nFichier "boot.dat" généré avec succès dans ./SD/ !'));
    })

    try {
        await fs.copy('./temp/atmosphere/', './SD/');
        console.log(chalk.green(`\nContenu du dossier ${chalk.bold("./temp/atmosphere/")} copié dans ${chalk.bold("./SD/")}.`));
        await fs.copy('./temp/hekate/bootloader/', './SD/bootloader/');
        console.log(chalk.green(`Contenu du dossier ${chalk.bold("./temp/hekate/bootloader/")} copié dans ${chalk.bold("./SD/bootloader/")}.`));
        await fs.copy('./temp/fusee/atmosphere/', './SD/atmosphere/');
        console.log(chalk.green(`Contenu du dossier ${chalk.bold("./temp/fusee/atmosphere/")} copié dans ${chalk.bold("./SD/atmosphere/")}.`));
        await fs.copy('./temp/awoo_installer/switch/', './SD/switch/');
        console.log(chalk.green(`Contenu du dossier ${chalk.bold("./temp/awoo_installer/switch/")} copié dans ${chalk.bold("./SD/switch/")}.`));
        await fs.copy('./temp/fusee_primary.bin', './SD/bootloader/payloads/fusee-primary.bin');
        console.log(chalk.green(`Fichier ${chalk.bold("./temp/fusee_primary.bin")} copié dans ${chalk.bold("./SD/bootloader/payloads/fusee-primary.bin")}.`));
        await fs.copy('./temp/hekate/hekate_ctcaer.bin', './SD/payload.bin');
        console.log(chalk.green(`Fichier ${chalk.bold("./temp/hekate/hekate_ctcaer.bin")} copié dans ${chalk.bold("./SD/payload.bin")}.`));
        await fs.copy('./temp/hekate/hekate_ctcaer.bin', './SD/atmosphere/reboot_payload.bin');
        console.log(chalk.green(`Fichier ${chalk.bold("./temp/hekate/hekate_ctcaer.bin")} copié dans ${chalk.bold("./SD/atmosphere/reboot_payload.bin")}.`));
        await fs.copy('./temp/hekate_ipl.ini', './SD/bootloader/hekate_ipl.ini');
        console.log(chalk.green(`Fichier ${chalk.bold("./temp/hekate_ipl.ini")} copié dans ${chalk.bold("./SD/bootloader/hekate_ipl.ini")}.`));
        await fs.copy('./temp/exosphere.ini', './SD/exosphere.ini');
        console.log(chalk.green(`Fichier ${chalk.bold("./temp/exosphere.ini")} copié dans ${chalk.bold("./SD/exosphere.ini")}.`));

        if (!fs.existsSync('./SD/atmosphere/hosts'))
            await fs.mkdir('./SD/atmosphere/hosts');

        console.log(chalk.green(`Dossier ${chalk.bold("./SD/atmosphere/hosts")} créé.`));

        await fs.copy('./temp/sysmmc.txt', './SD/atmosphere/hosts/sysmmc.txt');
        console.log(chalk.green(`Fichier ${chalk.bold("./temp/sysmmc.txt")} copié dans ${chalk.bold("./SD/atmosphere/hosts/sysmmc.txt")}.`));
        await fs.copy('./temp/emummc.txt', './SD/atmosphere/hosts/emummc.txt');
        console.log(chalk.green(`Fichier ${chalk.bold("./temp/emummc.txt")} copié dans ${chalk.bold("./SD/atmosphere/hosts/emummc.txt")}.`));
        await fs.copy('./temp/TinWoo-Installer/', './SD/');
        console.log(chalk.green(`Contenu du dossier ${chalk.bold("./temp/TinWoo-Installer/")} copié dans ${chalk.bold("./SD/")}.`));
        await fs.copy('./temp/tinfoil/', './SD/');
        console.log(chalk.green(`Contenu du dossier ${chalk.bold("./temp/tinfoil/")} copié dans ${chalk.bold("./SD/")}.`));

        let homebrews = await fs.readdir(output_folder).then(files => { return files.filter(f => f.endsWith('nro')) });
        
        for (let homebrew of homebrews) {
            await fs.copy(`./temp/${homebrew}`, `./SD/switch/${homebrew}`);
            console.log(chalk.green(`Fichier ${chalk.bold(`./temp/${homebrew}`)} copié dans ${chalk.bold(`./SD/switch/${homebrew}`)}.`));
        };

        let zip = new AdmZip();

        zip.addLocalFolder('./SD/');
        zip.toBuffer(async (buffer, err) => {
            console.log('pack.zip en cours de création...')
            if (err)
                throw err;

            console.log('\nContenu du pack:')
            
            for (let file of files) {
                const { name, version } = file;
                console.log(`${name} (${version})`);
            };

            if(buffer) {
                await fs.emptyDir('./temp/', { recursive: true })
                console.log('Contenu du dossier "./temp" supprimé.');
                console.log(chalk.bold.green('\nTerminé ! pack.zip est disponible à la racine du programme !'));
            };

        });
        zip.writeZip('./pack.zip');
    } catch (error) {
        console.log(chalk.red(error));
    };
})();