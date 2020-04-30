const { readdirSync, readFileSync, writeFileSync, createWriteStream } = require('fs');
const { join } = require('path');
// const Chart = require('chart.js');
// const { createCanvas } = require('canvas')

let output;
let ageMarkers = [5]; // e.g. [5,15,39] would give 0-4, 5-14, 15-38, 39+

const resetOutput = () => {
  output = {
    yearCounts: {},
    weekCounts: {},
  };
}

const getStartOfWeek = (dateString) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1 - (date.getDay() || 7));
  return date;
}

const processDataFile = (filename) => {
  const trigger = filename.replace('trigger-', '').split('.')[0];
  output.yearCounts[symptom] = {};
  output.weekCounts[symptom] = {};
  readFileSync(join('data-extraction', 'data', filename), 'utf8')
    .split('\n')
    .slice(1)
    .forEach(line => {
      const [dateString, count] = line.trim().replace('/\r/g','').split(',');
      if(!dateString) return;
      const date = new Date(dateString);
      const year = date.getFullYear();
      const startOfWeek = getStartOfWeek(dateString);
      let startOfWeekYear = startOfWeek.getFullYear();
      if(startOfWeekYear === 1999) return;
      if(!output.weekCounts[symptom][startOfWeekYear]) {
        output.weekCounts[symptom][startOfWeekYear] = {};
      }
      if(!output.weekCounts[symptom][startOfWeekYear][startOfWeek.getTime()]) {
        output.weekCounts[symptom][startOfWeekYear][startOfWeek.getTime()] = 0;
      }
      output.weekCounts[symptom][startOfWeekYear][startOfWeek.getTime()] += +count;
      if(date.getMonth()<7) return;
      if(!output.yearCounts[symptom][year]) output.yearCounts[symptom][year] = 0;
      output.yearCounts[symptom][year] += +count;
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
      const codeString = allCodes.join("','");
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
