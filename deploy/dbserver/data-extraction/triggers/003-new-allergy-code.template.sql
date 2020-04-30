--Just want the output, not the messages
SET NOCOUNT ON; 

--Get the any first occurrences of an allergy code for all patients
SELECT PatID, firstAllergyDate INTO #FirstAllergies FROM (
  SELECT PatID, ReadCode, MIN(EntryDate) as firstAllergyDate FROM SIR_ALL_Records_Narrow
  WHERE ReadCode IN ({{CODESET:DrugAllergy}})
  GROUP BY PatID, ReadCode
) sub
WHERE firstAllergyDate > '{{REPORT_DATE_MINUS_3_MONTHS}}'
AND firstAllergyDate <= '{{REPORT_DATE}}'

--Number of time this happens per practice
select gpcode, count(*) as num INTO #EventsPerPractice from #FirstAllergies e INNER JOIN patients p on p.patid = e.PatID
group by gpcode;

--Number of patients this happens to per practice
select gpcode, count(*) as num INTO #PatientsPerPractice from patients p inner join (select distinct PatID from #FirstAllergies) e on p.patid = e.PatID
group by gpcode;

--Get results
PRINT 'Report date: {{REPORT_DATE}}'
PRINT 'EHR,GPCode, PracticeName, PracticeListSize, Events, Patients'
select ehr, a.gpcode, practiceName, practiceListSize, ISNULL(a.num, 0) as occurances, ISNULL(b.num, 0) as patients
from practiceDetails d
left outer join #EventsPerPractice e on d.practiceId COLLATE Latin1_General_100_CI_AI = e.gpcode
left outer join #PatientsPerPractice b on d.practiceId COLLATE Latin1_General_100_CI_AI = b.gpcode
left outer join practiceListSizes pl on pl.practiceId = d.practiceId
order by d.practiceId