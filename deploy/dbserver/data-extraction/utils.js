const { readdirSync, readFileSync, writeFileSync, createWriteStream } = require('fs');
const { join } = require('path');
// const Chart = require('chart.js');
// const { createCanvas } = require('canvas')

let output;
let ageMarkers = [5]; // e.g. [5,15,39] would give 0-4, 5-14, 15-38, 39+

const resetOutput = () => {
  output = {
    // yearCounts: {},
    // weekCounts: {},
  };
}

const getTable = (name) => {
  return `
  <h2>${name} (${output[name].reportDate})</h2>
  <table class="table table-sm">
    <caption>${name}</caption>
    <thead>
      <tr>
        ${output[name].headers.map(header => `<th>${header}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${output[name].body
        .filter(row => row.length > 2)
        .map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>`
}

const getTables = () => Object.keys(output).map(getTable);

const getHTML = () => {
  const htmlTemplate = readFileSync(join(__dirname, 'html-templates', 'wrapper.html'), 'utf8');
  const html = htmlTemplate.replace('{{CONTENT}}', getTables());
  return html;
};

exports.writeHTML = () => writeFileSync(join(__dirname, 'output', 'results.html'), getHTML());

const processDataFile = (filename) => {
  const trigger = filename.replace(/trigger-[0-9]{3}-/, '').split('.')[0];
  output[trigger] = { body: [] };
  readFileSync(join(__dirname, 'data', filename), 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if(i === 0) {
        // Report date
        output[trigger].reportDate = line.split(':')[1].trim();
      } else if (i === 1) {
        // Headers
        output[trigger].headers = line.split(',');
      } else {
        output[trigger].body.push(line.split(','));
      }
    });
}

exports.processRawDataFiles = () => {
  resetOutput();
  readdirSync(join(__dirname, 'data'))
    .filter(x => x.indexOf('.txt') > -1)
    .forEach(file => processDataFile(file));
  return output;
}

const codesFromFile = (pathToFile) => readFileSync(pathToFile, 'utf8')
  .replace(/\r/g,'')
  .split('\n')
  .map(x => x.split('\t')[0]);

const codesWithoutTermCode = (codes) => {
  const codesWithoutTermExtension = codes
    .filter(x => x.length===7 && x[5] === '0' && x[6] === '0')
    .map(x => x.substr(0,5));
  return codes.concat(codesWithoutTermExtension);
}

const getTriggerNames = (filename) => {
  const triggerDashed = filename.split('.')[0].replace('trigger-','');
  const triggerCapitalCase = triggerDashed.split('-').map(x => x[0].toUpperCase() + x.slice(1)).join('');
  const triggerLowerSpaced = triggerDashed.split('-').map(x => x.toLowerCase()).join(' ');
  return { triggerDashed, triggerCapitalCase, triggerLowerSpaced };
}

const loadCodeSets = () => {
  const codesets = {};
  readdirSync(join(__dirname, 'codesets'))
    .filter(x => {
      if(x.indexOf('.json') > -1) return false; // don't want the metadata
      return true;
    })
    .map(filename => {
      const {triggerDashed, triggerCapitalCase, triggerLowerSpaced} = getTriggerNames(filename);      
      const codes = codesFromFile(join(__dirname, 'codesets', filename));
      const allCodes = codesWithoutTermCode(codes);
      const codeString = `'${allCodes.join("','")}'`;
      codesets[triggerCapitalCase] = codeString;
    });
  return codesets;
}

const loadSQLTemplates = () => readdirSync(join(__dirname, 'triggers'))
    .map(filename => {
      const template = readFileSync(join(__dirname, 'triggers', filename), 'utf8');
      return {name: filename.split('.')[0], template};
    });

const createAndWriteSQLFile = ({template, codesets, name, reportDateString, reportDateMinus3MonthsString}) => {
  let query = template.replace(/\{\{REPORT_DATE_MINUS_3_MONTHS\}\}/g, reportDateMinus3MonthsString);
  query = query.replace(/\{\{REPORT_DATE\}\}/g, reportDateString);
  while(query.indexOf('{{CODESET:') > -1) {
    const codeset = query.match(/\{\{CODESET:([^}]+)\}\}/)[1];
    const codesetRegex = new RegExp(`\{\{CODESET:${codeset}\}\}`, 'g');
    query = query.replace(codesetRegex, codesets[codeset]);
  }
  writeFileSync(join(__dirname, 'sql-queries', `trigger-${name}.sql`), query);  
};

exports.createSqlQueries = ({reportDateString, reportDateMinus3MonthsString}) => {
  const codesets = loadCodeSets();
  const templates = loadSQLTemplates();

  templates.forEach((template) => {
    createAndWriteSQLFile({codesets, reportDateString, reportDateMinus3MonthsString, ...template});
  });
};

exports.sqlDateStringFromDate = (date = new Date()) => date.toISOString().substr(0,10);
