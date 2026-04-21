const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const dictionaries = {};

// Load all languages
const loadLocales = () => {
    if (!fs.existsSync(localesDir)) return;
    const files = fs.readdirSync(localesDir);
    files.forEach(file => {
        if (file.endsWith('.json')) {
            const lang = file.replace('.json', '');
            const content = fs.readFileSync(path.join(localesDir, file), 'utf8');
            try {
                dictionaries[lang] = JSON.parse(content);
            } catch (err) {
                console.error(`Error parsing locale file: ${file}`, err);
            }
        }
    });
};

loadLocales();

function translate(lang, key) {
    if (dictionaries[lang] && dictionaries[lang][key]) {
        return dictionaries[lang][key];
    }
    // Fallback to English
    if (dictionaries['en'] && dictionaries['en'][key]) {
        return dictionaries['en'][key];
    }
    // Return key if not found
    return key;
}

module.exports = {
    translate,
    loadLocales
};
