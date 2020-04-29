const { readdirSync, readFileSync, writeFileSync, createWriteStream } = require('fs');
const { join } = require('path');
const Chart = require('chart.js');
const { createCanvas } = require('canvas')

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
  const symptom = filename.replace('dxs-', '').split('.')[0];
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

exports.processRawDataFiles = (directory = './data-extraction/data') => {
  resetOutput();
  readdirSync(directory)
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

exports.createSqlQueries = () => {
  const template = readFileSync(join(__dirname, 'sql-queries', 'template.sql'), 'utf8');
  readdirSync(join(__dirname, 'codesets'))
    .filter(x => {
      if(x.indexOf('.json') > -1) return false; // don't want the metadata
      return true;
    })
    .map(filename => {
      const symptomDashed = filename.split('.')[0].replace('dx-','');
      const symptomCapitalCase = symptomDashed.split('-').map(x => x[0].toUpperCase() + x.slice(1)).join('');
      const symptomLowerSpaced = symptomDashed.split('-').map(x => x.toLowerCase()).join(' ');
      const codes = codesFromFile(join(__dirname, 'data-extraction', 'codesets', filename));
      const allCodes = codesWithoutTermCode(codes);
      const codeString = allCodes.join("','");
      let query = template.replace(/\{\{SYMPTOM_LOWER_SPACED\}\}/g, symptomLowerSpaced);
      query = query.replace(/\{\{SYMPTOM_CAPITAL_NO_SPACE\}\}/g, symptomCapitalCase);
      query = query.replace(/\{\{SYMPTOM_DASHED\}\}/g, symptomDashed);
      query = query.replace(/\{\{CLINICAL_CODES\}\}/g, codeString);
      const ageQueryBase = query.slice(0);
      query = query.replace(/\{\{!AGE\}\}[\s\S]*\{\{AGE\}\}/,"");
      query = query.replace(/\{\{.?MAIN\}\}/g,"");
      writeFileSync(join(__dirname, 'data-extraction', 'sql-queries', `dxs-${symptomDashed}.sql`), query);
      // age queries
      let lowerAge = 0;
      ageMarkers.forEach(ageMarker => {
        let ageBase = ageQueryBase.replace(/\{\{!MAIN\}\}[\s\S]*\{\{MAIN\}\}/,"");
        ageBase = ageBase.replace(/\{\{.?AGE\}\}/g,"");
        ageBase = ageBase.replace(/\{\{LOWER_AGE\}\}/g, lowerAge);
        ageBase = ageBase.replace(/\{\{UPPER_AGE\}\}/g, ageMarker);
        writeFileSync(join(__dirname, 'data-extraction', 'sql-queries', `dxs-${symptomDashed}-age-${lowerAge}-${ageMarker}.sql`), ageBase);
        lowerAge = ageMarker;
      });
      let ageBase = ageQueryBase.replace(/\{\{!MAIN\}\}[\s\S]*\{\{MAIN\}\}/,"");
      ageBase = ageBase.replace(/\{\{.?AGE\}\}/g,"");
      ageBase = ageBase.replace(/\{\{LOWER_AGE\}\}/g, lowerAge);
      ageBase = ageBase.replace(/\{\{UPPER_AGE\}\}/g, 120);
      writeFileSync(join(__dirname, 'data-extraction', 'sql-queries', `dxs-${symptomDashed}-age-${lowerAge}-.sql`), ageBase);
    })
};
