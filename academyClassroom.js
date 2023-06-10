setInterval(function() {
    const searchTerm = searchInput.value;
    const weekday = document.getElementById('weekdaysDropdown').value;
    const from = document.getElementById('timeFromDropdown').value;
    const to = document.getElementById('timeToDropdown').value;

    if (!searchTerm && weekday == 'Day' && from == 'From' && to == 'To') {
        location.reload();
    }
  }, 600000);

const searchInput = document.getElementById('search');

searchInput.addEventListener('keyup', performSearch);

function resetFilters() {
    cleanSearchResults();
    searchInput.value = "";
    document.getElementById('weekdaysDropdown').value = "Day";
    document.getElementById('timeFromDropdown').value = "From";
    document.getElementById('timeToDropdown').value = "To";
}

function performSearch() {
    const searchTerm = searchInput.value;
    const weekday = document.getElementById('weekdaysDropdown').value;
    const from = document.getElementById('timeFromDropdown').value;
    const to = document.getElementById('timeToDropdown').value;

    if (!searchTerm && weekday == 'Day' && from == 'From' && to == 'To') {
        cleanSearchResults();
        return;
    }

    let query = "/api/schedule/search?term=" + searchTerm;
    if (weekday != 'Day') {
        query += "&day=" + weekday;
    }
    if (from != 'From') {
        query += "&from=" + from;
    }
    if (to != 'To') {
        query += "&to=" + to;
    }

    fetch(query)
        .then(response => response.json())
        .then(data => {
            displaySearchResults(data);
        })
        .catch(error => {
        console.error(error);
    });
}

function cleanSearchResults() {
    const container = document.getElementById("searchResults");
    container.style.display = "none";
}

function clearTable(name) {
    var table = document.getElementById(name).getElementsByTagName('tbody')[0];
    while (table.rows.length > 0) {
        table.deleteRow(0);
    }
}

function getFormattedAvailableHours(availableHours) {
    const finalList = [];
    for (let i = 0; i < availableHours.length; ++i) {
        let pair = {
            from: availableHours[i],
            to: null,
        };
        for (let j = i + 1; j < availableHours.length; ++j) {
            if ((parseInt(availableHours[j]) - parseInt(availableHours[i])) > 70) {
                pair.to = availableHours[j - 1];
                break;
            }
        }
        finalList.push(pair);
    }

    let result = [];
    let currentRange = {from: null, to: null};

    for (let i = 0; i < finalList.length; i++) {
        if (finalList[i].from !== null) {
            if (currentRange.from === null) {
            currentRange.from = finalList[i].from;
            } else if (currentRange.to !== null && currentRange.to !== finalList[i].from) {
            result.push(currentRange);
            currentRange = {from: finalList[i].from, to: null};
            }
        }
        if (finalList[i].to !== null) {
            currentRange.to = finalList[i].to;
        }
    }

    if (currentRange.from !== null) {
        result.push(currentRange);
    }

    let formatted = result.map(pair => {
        let fromStr = pair.from.toString();
        let toStr = (pair.to || '').toString();
        fromStr = fromStr.substring(0, 2) + ':' + fromStr.substring(2);
        toStr = toStr.substring(0, 2) + ':' + toStr.substring(2);
        if (fromStr == "22:30") return undefined;
        return fromStr + " - " + toStr;
    });

    return formatted.join(', ');
}

function findAvailableSpots() {
    const weekday = document.getElementById('weekdaysDropdown').value;
    const from = document.getElementById('timeFromDropdown').value;
    const to = document.getElementById('timeToDropdown').value;

    const container = document.getElementById("searchResults");
    container.style.display = "block";

    clearTable("searchResultsGroupsTable");

    let query = "/api/schedule/availability?";
    if (weekday != 'Day') {
        query += "&day=" + weekday;
    }
    if (from != 'From') {
        query += "&from=" + from;
    }
    if (to != 'To') {
        query += "&to=" + to;
    }

    fetch(query)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            Object.keys(data).forEach(classroom => {
                addRowGroupsTable('', classroom, 'Available Days and Hours');
                Object.keys(data[classroom]).forEach(day => {
                    let scheduleText = day.toUpperCase() + ": ";
                    let availableHours = Object.keys(data[classroom][day]).filter(hour => {
                        return data[classroom][day][hour] == true;
                    })
                    scheduleText += getFormattedAvailableHours(availableHours);
                    addRowGroupsTable('', '', scheduleText);
                });
            })
        })
        .catch(error => {
        console.error(error);
    });
}

function displaySearchResults(results) {
    const container = document.getElementById("searchResults");
    container.style.display = "block";

    clearTable("searchResultsGroupsTable");
    // clearTable("searchResultsTeachersTable");

    Object.keys(results.groups || {}).forEach(groupName => {
        const group = results.groups[groupName];
        Object.keys(group).forEach(roomName => {
            const classroom = group[roomName];
            let scheduleText = "";
            Object.keys(classroom).forEach(day => {
                const weekday = classroom[day];
                scheduleText += day.toUpperCase() + ": ";
                let hourStart = weekday.hours[0].toString();
                let hourEnd = weekday.hours[weekday.hours.length - 1];
                if (parseInt(hourEnd) % 100 == 0) {
                    hourEnd += 30;
                } else {
                    hourEnd += 70;
                }
                hourEnd = hourEnd.toString();
                scheduleText += hourStart.substring(0, 2) + ":" + hourStart.substring(2);
                scheduleText += ' - ';
                scheduleText += hourEnd.substring(0, 2) + ":" + hourEnd.substring(2);
                scheduleText += ". Teacher: " + weekday.teacher + " | ";
            });
            addRowGroupsTable(groupName, roomName, scheduleText);
        });
    });
}

function addRowGroupsTable(first, second, third) {
    var table = document.getElementById("searchResultsGroupsTable").getElementsByTagName('tbody')[0];
    var newRow = table.insertRow(table.length);

    var groupCell = newRow.insertCell(0);
    var classroomCell = newRow.insertCell(1);
    var scheduleCell = newRow.insertCell(2);

    groupCell.innerText = first;
    classroomCell.innerText = second;
    scheduleCell.innerText = third;
}

function addNewGroup() {
    const val = document.getElementById('groupNameInput').value;

    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: val })
    };

    fetch("/api/groups" + window.location.search, requestOptions)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            location.reload();
        })
        .catch(error => {
        console.error(error);
    });
}

function deleteGroup(group) {
    const requestOptions = {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: group })
    };

    fetch("/api/groups" + window.location.search, requestOptions)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            location.reload();
        })
        .catch(error => {
        console.error(error);
    });
}

function addNewTeacher() {
    const val = document.getElementById('teacherNameInput').value;

    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: val })
    };

    fetch("/api/teachers" + window.location.search, requestOptions)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            location.reload();
        })
        .catch(error => {
        console.error(error);
    });
}

function deleteTeacher(teacher) {
    const requestOptions = {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teacher })
    };

    fetch("/api/teachers" + window.location.search, requestOptions)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            location.reload();
        })
        .catch(error => {
        console.error(error);
    });
}

function deleteSlot(classroom, day, time) {
    const requestOptions = {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroom, day, time })
    };

    fetch("/api/schedule" + window.location.search, requestOptions)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            location.reload();
        })
        .catch(error => {
        console.error(error);
    });
}

function addAllSlots(from, to, details) {
    if (from >= to) {
        location.reload();
        return;
    }

    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            group: details.group,
            classroom: details.classroom,
            teacher: details.teacher,
            day: details.day,
            time: from,
            rec: details.rec,
            reserved: details.reserved,
         })
    };

    fetch("/api/schedule" + window.location.search, requestOptions)
        .then(response => response.json())
        .then(data => {
            if (from % 100 == 0) {
                from += 30;
            } else {
                from += 70;
            }
            addAllSlots(from, to, details);
        })
        .catch(error => {
            console.error(error);
        });
}

function addNewScheduleSlot() {
    const group = document.getElementById('addGroupDropdown').value;
    const classroom = document.getElementById('addClassroomDropdown').value;
    const teacher = document.getElementById('addTeacherDropdown').value;
    const day = document.getElementById('addDayDropdown').value;
    const hourFrom = document.getElementById('addHourFromDropdown').value;
    const hourTo = document.getElementById('addHourToDropdown').value;
    const rec = document.getElementById('recording').checked;
    const reserved = document.getElementById('reserved').checked;

    addAllSlots(parseInt(hourFrom), parseInt(hourTo), {
        group,
        classroom,
        teacher,
        day,
        rec,
        reserved,
    });
}

function getStringTime(time) {
    let arr = time.toString().split('');
    arr.splice(2, 0, ':');
    if (arr[3] == '5') { arr[3] = '3'; }
    let str = arr.join('');
    return str;
}