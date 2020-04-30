--Just want the output, not the messages
SET NOCOUNT ON; 

--Get all encounters in the last 3 months
SELECT PatID, EntryDate INTO #Encounters FROM SIR_ALL_Records
WHERE EntryDate > '{{REPORT_DATE_MINUS_3_MONTHS}}'
AND EntryDate <= '{{REPORT_DATE}}'
AND ReadCode = '~ENCT' 
AND LOWER(Rubric) LIKE '%consultation%'
AND Rubric NOT LIKE 'Non%'
AND Rubric NOT LIKE 'Third%'
GROUP BY PatID, EntryDate;

--Find anyone with 3 encounters in 7 days
SELECT e1.PatID,e2.EntryDate INTO #Encounters3In7 FROM #Encounters e1
	INNER JOIN #Encounters e2 on e1.PatID = e2.PatID and e1.EntryDate < e2.EntryDate AND e1.EntryDate > DATEADD(day, -7, e2.EntryDate)
GROUP BY e1.PatID,e2.EntryDate
HAVING COUNT(*) > 1;

--Number of time this happens per practice
select gpcode, count(*) as num INTO #EncountersPerPractice from #Encounters3In7 e INNER JOIN patients p on p.patid = e.PatID
group by gpcode;

--Number of patients this happens to per practice
select gpcode, count(*) as num INTO #PatientsPerPractice from patients p inner join (select distinct PatID from #Encounters3In7) e on p.patid = e.PatID
group by gpcode;

--Find anyone with 4 encounters in 7 days
SELECT e1.PatID,e2.EntryDate INTO #Encounters4In7 FROM #Encounters e1
	INNER JOIN #Encounters e2 on e1.PatID = e2.PatID and e1.EntryDate < e2.EntryDate AND e1.EntryDate > DATEADD(day, -7, e2.EntryDate)
GROUP BY e1.PatID,e2.EntryDate
HAVING COUNT(*) > 2;

--Number of time this happens per practice
select gpcode, count(*) as num INTO #Encounters4PerPractice from #Encounters4In7 e INNER JOIN patients p on p.patid = e.PatID
group by gpcode;

--Number of patients this happens to per practice
select gpcode, count(*) as num INTO #Patients4PerPractice from patients p inner join (select distinct PatID from #Encounters4In7) e on p.patid = e.PatID
group by gpcode;

--Find anyone with 5 encounters in 7 days
SELECT e1.PatID,e2.EntryDate INTO #Encounters5In7 FROM #Encounters e1
	INNER JOIN #Encounters e2 on e1.PatID = e2.PatID and e1.EntryDate < e2.EntryDate AND e1.EntryDate > DATEADD(day, -7, e2.EntryDate)
GROUP BY e1.PatID,e2.EntryDate
HAVING COUNT(*) > 3;

--Number of time this happens per practice
select gpcode, count(*) as num INTO #Encounters5PerPractice from #Encounters5In7 e INNER JOIN patients p on p.patid = e.PatID
group by gpcode;

--Number of patients this happens to per practice
select gpcode, count(*) as num INTO #Patients5PerPractice from patients p inner join (select distinct PatID from #Encounters5In7) e on p.patid = e.PatID
group by gpcode;

--Find anyone with 6 encounters in 7 days
SELECT e1.PatID,e2.EntryDate INTO #Encounters6In7 FROM #Encounters e1
	INNER JOIN #Encounters e2 on e1.PatID = e2.PatID and e1.EntryDate < e2.EntryDate AND e1.EntryDate > DATEADD(day, -7, e2.EntryDate)
GROUP BY e1.PatID,e2.EntryDate
HAVING COUNT(*) > 4;

--Number of time this happens per practice
select gpcode, count(*) as num INTO #Encounters6PerPractice from #Encounters6In7 e INNER JOIN patients p on p.patid = e.PatID
group by gpcode;

--Number of patients this happens to per practice
select gpcode, count(*) as num INTO #Patients6PerPractice from patients p inner join (select distinct PatID from #Encounters6In7) e on p.patid = e.PatID
group by gpcode;

--Find anyone with 7 encounters in 7 days
SELECT e1.PatID,e2.EntryDate INTO #Encounters7In7 FROM #Encounters e1
	INNER JOIN #Encounters e2 on e1.PatID = e2.PatID and e1.EntryDate < e2.EntryDate AND e1.EntryDate > DATEADD(day, -7, e2.EntryDate)
GROUP BY e1.PatID,e2.EntryDate
HAVING COUNT(*) > 5;

--Number of time this happens per practice
select gpcode, count(*) as num INTO #Encounters7PerPractice from #Encounters7In7 e INNER JOIN patients p on p.patid = e.PatID
group by gpcode;

--Number of patients this happens to per practice
select gpcode, count(*) as num INTO #Patients7PerPractice from patients p inner join (select distinct PatID from #Encounters7In7) e on p.patid = e.PatID
group by gpcode;

--Get results
PRINT 'Report date: {{REPORT_DATE}}'
PRINT 'EHR,GPCode, PracticeName, PracticeListSize, Events-3-in-7, Patients-3-in-7, Events-4-in-7, Patients-4-in-7, Events-5-in-7, Patients-5-in-7, Events-6-in-7, Patients-6-in-7, Events-7-in-7, Patients-7-in-7'
select ehr, a.gpcode, practiceName, practiceListSize, a.num as occurances, b.num as patients, ISNULL(e4.num,0) as events4, ISNULL(p4.num,0) as patients4, ISNULL(e5.num,0) as events5, ISNULL(p5.num,0) as patients5, ISNULL(e6.num,0) as events6, ISNULL(p6.num,0) as patients6, ISNULL(e7.num,0) as events7, ISNULL(p7.num,0) as patients7
from #EncountersPerPractice a 
inner join #PatientsPerPractice b on a.gpcode = b.gpcode
inner join practiceDetails d on d.practiceId COLLATE Latin1_General_100_CI_AI = a.gpcode
inner join practiceListSizes pl on pl.practiceId COLLATE Latin1_General_100_CI_AI = a.gpcode
left outer join #Encounters4PerPractice e4 on e4.gpcode = a.gpcode
left outer join #Patients4PerPractice p4 on p4.gpcode = a.gpcode
left outer join #Encounters5PerPractice e5 on e5.gpcode = a.gpcode
left outer join #Patients5PerPractice p5 on p5.gpcode = a.gpcode
left outer join #Encounters6PerPractice e6 on e6.gpcode = a.gpcode
left outer join #Patients6PerPractice p6 on p6.gpcode = a.gpcode
left outer join #Encounters7PerPractice e7 on e7.gpcode = a.gpcode
left outer join #Patients7PerPractice p7 on p7.gpcode = a.gpcode
order by a.gpcode
