const { 
  createSqlQueries,
  processRawDataFiles,
  sqlDateStringFromDate,
  writeHTML,
  // getTableOfResults, 
  // drawIndividualBarCharts,
  // drawIndividualLineCharts,
} = require('./utils');

const reportDateString = process.argv[2] || sqlDateStringFromDate();
const reportDateMinus3Months = new Date(reportDateString);
reportDateMinus3Months.setMonth(reportDateMinus3Months.getMonth() - 3);
const reportDateMinus3MonthsString = sqlDateStringFromDate(reportDateMinus3Months);

createSqlQueries({reportDateString, reportDateMinus3MonthsString});

const data = processRawDataFiles();
writeHTML();
