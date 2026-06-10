-- read_events.scpt v5
-- Reads events from a calendar, filtered by date range
-- Usage: osascript read_events.scpt "日历名称" "YYYY-MM-DD" "YYYY-MM-DD"
-- Writes JSON to /tmp/read_events_output.json (proper Unicode via Python)

on run argv
    if (count of argv) < 3 then
        return "[]"
    end if
    
    set targetCalName to item 1 of argv
    set startDateStr to item 2 of argv
    set endDateStr to item 3 of argv
    set outputPath to "/tmp/read_events_output.json"
    
    tell application "Calendar"
        set targetCal to null
        repeat with cal in calendars
            if name of cal is targetCalName then
                set targetCal to cal
                exit repeat
            end if
        end repeat
        
        if targetCal is null then
            do shell script "echo '[]' > " & quoted form of outputPath
            return "[]"
        end if
        
        set rawLines to ""
        
        repeat with evt in (events of targetCal)
            set evtStart to start date of evt
            set evtYear to year of evtStart as text
            set evtMonthInt to month of evtStart as integer
            set evtDayInt to day of evtStart
            set evtHourInt to hours of evtStart
            set evtMinInt to minutes of evtStart
            
            set mStr to text -2 thru -1 of ("0" & (evtMonthInt as text))
            set dStr to text -2 thru -1 of ("0" & (evtDayInt as text))
            set hStr to text -2 thru -1 of ("0" & (evtHourInt as text))
            set miStr to text -2 thru -1 of ("0" & (evtMinInt as text))
            set dateOnly to evtYear & "-" & mStr & "-" & dStr
            
            if dateOnly ≥ startDateStr and dateOnly ≤ endDateStr then
                set endDate to end date of evt
                set endHourInt to hours of endDate
                set endMinInt to minutes of endDate
                set endHStr to text -2 thru -1 of ("0" & (endHourInt as text))
                set endMIStr to text -2 thru -1 of ("0" & (endMinInt as text))
                
                set startFull to dateOnly & "T" & hStr & ":" & miStr & ":00"
                set endFull to dateOnly & "T" & endHStr & ":" & endMIStr & ":00"
                
                set evtSummary to summary of evt
                set desc to ""
                try
                    set desc to description of evt
                end try
                
                -- Base64-encode non-ASCII strings
                set summaryB64 to do shell script "echo -n " & quoted form of evtSummary & " | base64"
                set descB64 to do shell script "echo -n " & quoted form of desc & " | base64"
                
                set rawLines to rawLines & startFull & "|" & endFull & "|" & summaryB64 & "|" & descB64 & "|BK"
            end if
        end repeat
        
    end tell
    
    -- Python parses base64 and produces proper JSON
    do shell script "python3 -c 'import base64,json,urllib.parse,sys; " & ¬
        "lines=open(\"/dev/stdin\").read().split(\"BK\"); " & ¬
        "rows=[]; " & ¬
        "for l in lines: " & ¬
        " if not l.strip(): continue; " & ¬
        " parts=l.split(\"|\"); " & ¬
        " if len(parts)>=4: " & ¬
        "  rows.append({\"start\":parts[0],\"end\":parts[1],\"summary\":base64.b64decode(parts[2]).decode(\"utf-8\"),\"description\":base64.b64decode(parts[3]).decode(\"utf-8\")}); " & ¬
        "with open(\"/tmp/read_events_output.json\",\"w\") as f: json.dump(rows,f,ensure_ascii=False)' << 'ENDBASE64\n" & rawLines & "\nENDBASE64"
    
    return "DONE"
end run