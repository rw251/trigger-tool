--Just want the output, not the messages
SET NOCOUNT ON; 

SELECT PatID, EntryDate INTO #LowHb FROM SIR_ALL_Records
WHERE (
	(ReadCode in ('423..11','423..00','423Z.00','4236.00','4235.00','4234.00','423..','423Z.','4236.','4235.','4234.') AND 
		(
			( CodeValue IS NOT NULL AND CodeValue > 0 AND CodeValue <10) OR
			( CodeValue IS NOT NULL AND CodeValue > 20 AND CodeValue <100)
		)
	)
	OR
	ReadCode in ('4234.00','4234.')
)
AND EntryDate > '2020-02-01'
AND EntryDate <= '2020-05-01'

--Number of time this happens per practice
select gpcode, count(*) as num INTO #EventsPerPractice from #LowHb e INNER JOIN patients p on p.patid = e.PatID
group by gpcode;

--Number of patients this happens to per practice
select gpcode, count(*) as num INTO #PatientsPerPractice from patients p inner join (select distinct PatID from #LowHb) e on p.patid = e.PatID
group by gpcode;

--Get results
PRINT 'Report date: 2020-05-01'
PRINT 'EHR,GPCode, PracticeName, PracticeListSize, Events, Patients'
select ehr, e.gpcode, practiceName, practiceListSize, ISNULL(e.num, 0) as occurances, ISNULL(b.num, 0) as patients
from practiceDetails d
left outer join #EventsPerPractice e on d.practiceId COLLATE Latin1_General_100_CI_AI = e.gpcode
left outer join #PatientsPerPractice b on d.practiceId COLLATE Latin1_General_100_CI_AI = b.gpcode
left outer join practiceListSizes pl on pl.practiceId = d.practiceId
where e.gpcode is not null
order by d.practiceId