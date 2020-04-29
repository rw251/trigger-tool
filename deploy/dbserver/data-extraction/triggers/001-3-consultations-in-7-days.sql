PRINT 'Date,{{SYMPTOM_CAPITAL_NO_SPACE}}'
select [date], ISNULL({{SYMPTOM_CAPITAL_NO_SPACE}}, 0) as {{SYMPTOM_CAPITAL_NO_SPACE}} from #AllDates d left outer join (
select * from (
	select PatID, EntryDate from SIR_ALL_Records_Narrow
	where ReadCode in ('{{CLINICAL_CODES}}')
	and EntryDate >= '2000-01-01'
	group by PatID, EntryDate
) sub 
group by EntryDate
) a on a.EntryDate = d.date
order by date;


SELECT PatID, EntryDate FROM SIR_ALL_Records_Narrow
WHERE EntryDate > DATEADD(month, -3, '{{REPORT_DATE}}')
AND EntryDate <= '{{REPORT_DATE}}'
AND ReadCode in ({{CODESET_CONSULTATIONS}})
GROUP BY PatID, EntryDate

