const { 
  createSqlQueries,
  processRawDataFiles, 
  // getTableOfResults, 
  // drawIndividualBarCharts,
  // drawIndividualLineCharts,
} = require('./utils');

createSqlQueries();

const data = processRawDataFiles();
console.log(data);
