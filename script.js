document.addEventListener('DOMContentLoaded', function() {
    let selectedYear = new Date().getFullYear();
    let db;

    // Yıl başlığı ve oklar
    function renderYearHeader() {
        const yearsEl = document.getElementById('years');
        yearsEl.innerHTML = `
            <span id="prev-year" style="cursor:pointer; font-size:30px; margin-right:20px;">&#8592;</span>
            <span id="year-value" style="cursor:pointer; font-size:30px;">${selectedYear}</span>
            <span id="next-year" style="cursor:pointer; font-size:30px; margin-left:20px;">&#8594;</span>
        `;
        document.getElementById('prev-year').onclick = () => changeYear(-1);
        document.getElementById('next-year').onclick = () => changeYear(1);
        document.getElementById('year-value').onclick = showYearSelector;
    }
    renderYearHeader();

    function changeYear(diff) {
        selectedYear += diff;
        onYearChanged();
    }

    function showYearSelector() {
        const panel = document.getElementById('year-selector');
        panel.style.display = 'block';
        document.getElementById('year-input').value = selectedYear;
        // Listeyi doldur
        let html = '';
        for(let y=selectedYear-5; y<=selectedYear+5; y++) {
            html += `<button onclick="selectYearDirect(${y})" style="margin:2px;">${y}</button>`;
        }
        document.getElementById('year-list').innerHTML = html;
    }
    window.closeYearSelector = function() {
        document.getElementById('year-selector').style.display = 'none';
    }
    window.selectYear = function() {
        const val = parseInt(document.getElementById('year-input').value);
        if(val && val>=2000 && val<=2100) {
            selectedYear = val;
            onYearChanged();
            closeYearSelector();
        }
    }
    window.selectYearDirect = function(y) {
        selectedYear = y;
        onYearChanged();
        closeYearSelector();
    }

    // Takvimi seçilen yıl için yeniden oluştur
    function renderCalendar() {
        const monthNames = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
        const dayNames = ["Pts", "Sal", "Çar", "Prş", "Cum", "Cts", "Paz"];
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();
        const divs = ['.div1', '.div2', '.div3', '.div4', '.div5', '.div6', '.div7', '.div8', '.div9', '.div10', '.div11', '.div12'];
        divs.forEach((div, index) => {
            const month = index;
            const daysInMonth = new Date(selectedYear, month + 1, 0).getDate();
            const firstDayIndex = (new Date(selectedYear, month, 1).getDay() + 6) % 7;
            const container = document.querySelector(div);
            container.innerHTML = `
                <div class="sol flexmid">
                    <h1>${monthNames[month]}</h1>
                </div>
                <div class="sag">
                    <ul class="weeks"></ul>
                    <ul class="days"></ul>
                </div>
            `;
            const weeksList = container.querySelector('.weeks');
            const daysList = container.querySelector('.days');
            dayNames.forEach(day => {
                const li = document.createElement('li');
                li.textContent = day;
                weeksList.appendChild(li);
            });
            for (let i = 0; i < firstDayIndex; i++) {
                const li = document.createElement('li');
                li.textContent = '';
                li.classList.add('inactive');
                daysList.appendChild(li);
            }
            for (let i = 1; i <= daysInMonth; i++) {
                const li = document.createElement('li');
                li.textContent = i;
                if (selectedYear === today.getFullYear() && index === currentMonth && i === currentDate) {
                    li.classList.add('currentday');
                }
                daysList.appendChild(li);
            }
            const totalDays = firstDayIndex + daysInMonth;
            for (let i = totalDays; i < 42; i++) {
                const li = document.createElement('li');
                li.textContent = '';
                li.classList.add('inactive');
                daysList.appendChild(li);
            }
        });
        // Günlere click event ekle
        setDayClickEvents();
    }

    // Günlere click event ekle
    function setDayClickEvents() {
        document.querySelectorAll('.days li').forEach(day => {
            day.addEventListener('click', function() {
                const selectedName = nameSelect.value;
                if (!selectedName) {
                    alert('Lütfen bir isim seçin.');
                    return;
                }
                const isHalfDay = document.getElementById('day-input').checked;
                let names = day.getAttribute('data-names');
                if (names) {
                    names = names.split(',');
                    if (names.includes(selectedName)) {
                        names = names.filter(name => name !== selectedName);
                        day.setAttribute('data-names', names.join(','));
                        if (names.length > 0) {
                            day.style.background = createGradient(names);
                        } else {
                            day.style.backgroundColor = '';
                            day.removeAttribute('data-names');
                        }
                        day.classList.remove('halfday');
                    } else {
                        names.push(selectedName);
                        day.setAttribute('data-names', names.join(','));
                        day.style.background = createGradient(names);
                        if (isHalfDay) {
                            day.classList.add('halfday');
                        }
                    }
                } else {
                    day.setAttribute('data-names', selectedName);
                    day.style.backgroundColor = colorMap[selectedName];
                    if (isHalfDay) {
                        day.classList.add('halfday');
                    }
                }
                updateRemainingDays(selectedName.toUpperCase());
            });
        });
    }

    // IndexedDB açılışında yıl bazlı veri
    const request = indexedDB.open('CalendarDB', 2);
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains('leaveDays')) {
            db.createObjectStore('leaveDays', { keyPath: 'id' });
        }
    };
    request.onsuccess = function(event) {
        db = event.target.result;
        renderCalendar();
        renderYearHeader();
        loadLeaveDays();
        loadLeaveDurationsPanel();
        loadCheckedNames();
    };
    request.onerror = function(event) {
        console.error('IndexedDB error:', event.target.errorCode);
    };

    // Yıl bazlı izin günlerini yükle
    function loadLeaveDays() {
        const transaction = db.transaction(['leaveDays'], 'readonly');
        const objectStore = transaction.objectStore('leaveDays');
        const yearKey = `selectedDays_${selectedYear}`;
        const reqAll = objectStore.getAll();
        reqAll.onsuccess = function(event) {
            // İzin gün süreleri
            document.querySelectorAll('.leave-input').forEach(inputDiv => {
                const name = inputDiv.getAttribute('data-name');
                const key = `${name}_${selectedYear}`;
                const found = event.target.result.find(item => item.id === key);
                inputDiv.querySelector('input').value = found ? found.days : 0;
            });
            // Takvimde günleri göster
            const selectedDaysObj = event.target.result.find(item => item.id === yearKey);
            if (selectedDaysObj && selectedDaysObj.days) {
                selectedDaysObj.days.forEach(day => {
                    const date = new Date(day.date);
                    const monthIndex = date.getMonth();
                    const dayIndex = date.getDate();
                    const firstDayIndex = (new Date(date.getFullYear(), monthIndex, 1).getDay() + 6) % 7;
                    const dayElement = document.querySelector(`.div${monthIndex + 1} .days li:nth-child(${dayIndex + firstDayIndex})`);
                    if (!dayElement) return;
                    let names = dayElement.getAttribute('data-names');
                    if (names) {
                        names = names.split(',');
                        if (!names.includes(day.name)) names.push(day.name);
                        dayElement.setAttribute('data-names', names.join(','));
                        dayElement.style.background = createGradient(names);
                    } else {
                        dayElement.setAttribute('data-names', day.name);
                        dayElement.style.backgroundColor = colorMap[day.name];
                    }
                    if (day.halfDay) {
                        dayElement.classList.add('halfday');
                    }
                });
            }
        };
    }

    // Sol paneldeki izin gün süreleri için yıl bazlı veri yönetimi
function loadLeaveDurationsPanel() {
    const transaction = db.transaction(['leaveDays'], 'readonly');
    const objectStore = transaction.objectStore('leaveDays');
    // Her isim için o yılın kaydını getir
    document.querySelectorAll('.leave-input').forEach(inputDiv => {
        const name = inputDiv.getAttribute('data-name');
        const key = `${name}_${selectedYear}`;
        const request = objectStore.get(key);
        request.onsuccess = function(event) {
            const data = event.target.result;
            inputDiv.querySelector('input').value = data ? data.days : 0;
        };
        request.onerror = function() {
            inputDiv.querySelector('input').value = 0;
        };
    });
}

// Yıl değiştiğinde paneli güncelle
function onYearChanged() {
    renderYearHeader();
    renderCalendar();
    loadLeaveDays();
    loadLeaveDurationsPanel();
    // Seçili isim varsa kalan izin gününü güncelle
    const selectedName = nameSelect.value ? nameSelect.value.toUpperCase() : "";
    updateRemainingDays(selectedName);
}

// KAYDET fonksiyonu sadece seçili yılın izin gün sürelerini günceller
window.saveLeaveDays = function() {
    const transaction = db.transaction(['leaveDays'], 'readwrite');
    const objectStore = transaction.objectStore('leaveDays');
    document.querySelectorAll('.leave-input').forEach(inputDiv => {
        const name = inputDiv.getAttribute('data-name');
        const days = inputDiv.querySelector('input').value;
        objectStore.put({ id: `${name}_${selectedYear}`, name, year: selectedYear, days: parseFloat(days) });
    });
    const selectedDays = [];
    document.querySelectorAll('.days li[data-names]').forEach(day => {
        const monthIndex = Array.from(day.closest('.months').classList).find(cls => cls.startsWith('div')).replace('div', '') - 1;
        const date = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day.textContent).padStart(2, '0')}`;
        const names = day.getAttribute('data-names').split(',');
        const isHalfDay = day.classList.contains('halfday');
        names.forEach(name => {
            selectedDays.push({
                date: date,
                name: name,
                halfDay: isHalfDay
            });
        });
    });
    objectStore.put({ id: `selectedDays_${selectedYear}`, year: selectedYear, days: selectedDays });
    transaction.oncomplete = function() {
        alert('İzin günleri kaydedildi!');
        loadLeaveDurationsPanel(); // Paneli güncelle
    };
    transaction.onerror = function(event) {
        console.error('Transaction error:', event.target.errorCode);
    };
};

    // Kalan izin günleri yıl bazlı gösterilir
    function updateRemainingDays(name) {
        if (!name) {
            remainingInput.value = 0;
            return;
        }
        const transaction = db.transaction(['leaveDays'], 'readonly');
        const objectStore = transaction.objectStore('leaveDays');
        const key = `${name.toLowerCase()}_${selectedYear}`;
        const request = objectStore.get(key);
        request.onsuccess = function(event) {
            const data = event.target.result;
            if (data) {
                // Takvimde işaretli günleri bul
                let usedLeaveDays = 0;
                document.querySelectorAll('.days li[data-names]').forEach(day => {
                    const names = day.getAttribute('data-names').split(',');
                    if (names.includes(name.toLowerCase())) {
                        usedLeaveDays += day.classList.contains('halfday') ? 0.5 : 1;
                    }
                });
                remainingInput.value = data.days - usedLeaveDays;
            } else {
                remainingInput.value = 0;
            }
        };
    }

    // Export/Import fonksiyonları yıl bazlı çalışır
    window.exportData = function() {
        const transaction = db.transaction(['leaveDays'], 'readonly');
        const objectStore = transaction.objectStore('leaveDays');
        const request = objectStore.getAll();
        request.onsuccess = function(event) {
            const data = event.target.result.filter(item => item.year === selectedYear);
            const json = JSON.stringify(data);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const dateTimeString = `${selectedYear}_${day}-${month}-${year} ${hours}-${minutes}.json`;
            a.download = dateTimeString;
            a.click();
            URL.revokeObjectURL(url);
        };
        request.onerror = function(event) {
            console.error('Export error:', event.target.errorCode);
        };
    };

    window.importData = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const json = event.target.result;
            const data = JSON.parse(json);
            const transaction = db.transaction(['leaveDays'], 'readwrite');
            const objectStore = transaction.objectStore('leaveDays');
            data.forEach(item => {
                objectStore.put(item);
            });
            transaction.oncomplete = function() {
                alert('Veriler başarıyla içe aktarıldı!');
                loadLeaveDays();
            };
            transaction.onerror = function(event) {
                console.error('Import error:', event.target.errorCode);
            };
        };
        reader.readAsText(file);
    };

    window.deleteAllData = function() {
        if (confirm("Bütün Veriler Silinecek Emin Misin?")) {
            const request = indexedDB.deleteDatabase('CalendarDB');
            request.onsuccess = function() {
                alert('Bütün veriler silindi.');
                location.reload();
            };
            request.onerror = function(event) {
                console.error('Veri silme hatası:', event.target.errorCode);
            };
        }
    };

    window.deletealldatedata = function() {
        if (confirm("Bütün tarih verileri silinecek. Emin misiniz?")) {
            const transaction = db.transaction(['leaveDays'], 'readwrite');
            const objectStore = transaction.objectStore('leaveDays');
            const yearKey = `selectedDays_${selectedYear}`;
            const request = objectStore.delete(yearKey);
        
            request.onsuccess = function() {
                alert('Tüm tarih verileri silindi.');
                location.reload();
            };
        
            request.onerror = function(event) {
                console.error('Veri silme hatası:', event.target.errorCode);
            };
        }
    };

    const nameSelect = document.getElementById('name-select');
    const colorMap = {
        osman: 'var(--osman)',
        kadir: 'var(--kadir)',
        elif: 'var(--elif)',
        mustafa: 'var(--mustafa)',
        bekir: 'var(--bekir)',
        merve: 'var(--merve)',
        hakan: 'var(--hakan)',
        yigit: 'var(--yigit)',
        ilhan: 'var(--ilhan)',
        bahar: 'var(--bahar)',
        seval: 'var(--seval)',
        omer: 'var(--omer)',
        tatil: 'var(--tatil)'
    };

    const remainingLabel = document.querySelector('#remainingday-input label');
    const remainingInput = document.getElementById('current-remaining');

    nameSelect.addEventListener('change', function() {
        const selectedName = nameSelect.value.toUpperCase();
        remainingLabel.textContent = `${selectedName}`;
        updateRemainingDays(selectedName);
    });

    // Takvimde günlere click event ekle
    function setDayClickEvents() {
        document.querySelectorAll('.days li').forEach(day => {
            day.addEventListener('click', function() {
                const selectedName = nameSelect.value;
                if (!selectedName) {
                    alert('Lütfen bir isim seçin.');
                    return;
                }
                const isHalfDay = document.getElementById('day-input').checked;
                let names = day.getAttribute('data-names');
                if (names) {
                    names = names.split(',');
                    if (names.includes(selectedName)) {
                        names = names.filter(name => name !== selectedName);
                        day.setAttribute('data-names', names.join(','));
                        if (names.length > 0) {
                            day.style.background = createGradient(names);
                        } else {
                            day.style.backgroundColor = '';
                            day.removeAttribute('data-names');
                        }
                        day.classList.remove('halfday');
                    } else {
                        names.push(selectedName);
                        day.setAttribute('data-names', names.join(','));
                        day.style.background = createGradient(names);
                        if (isHalfDay) {
                            day.classList.add('halfday');
                        }
                    }
                } else {
                    day.setAttribute('data-names', selectedName);
                    day.style.backgroundColor = colorMap[selectedName];
                    if (isHalfDay) {
                        day.classList.add('halfday');
                    }
                }
                updateRemainingDays(selectedName.toUpperCase());
            });
        });
    }

    // KAYDET fonksiyonu sadece seçili yılın izin gün sürelerini günceller
    window.saveLeaveDays = function() {
        const transaction = db.transaction(['leaveDays'], 'readwrite');
        const objectStore = transaction.objectStore('leaveDays');

        document.querySelectorAll('.leave-input').forEach(inputDiv => {
            const name = inputDiv.getAttribute('data-name');
            const days = inputDiv.querySelector('input').value;
            objectStore.put({ id: `${name}_${selectedYear}`, name, year: selectedYear, days: parseFloat(days) });
        });

        const selectedDays = [];
        document.querySelectorAll('.days li[data-names]').forEach(day => {
            const monthIndex = Array.from(day.closest('.months').classList).find(cls => cls.startsWith('div')).replace('div', '') - 1;
            const date = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day.textContent).padStart(2, '0')}`;
            const names = day.getAttribute('data-names').split(',');
            const isHalfDay = day.classList.contains('halfday');
            names.forEach(name => {
                selectedDays.push({
                    date: date,
                    name: name,
                    halfDay: isHalfDay
                });
            });
        });

        objectStore.put({ id: `selectedDays_${selectedYear}`, year: selectedYear, days: selectedDays });

        transaction.oncomplete = function() {
            alert('İzin günleri kaydedildi!');
        };

        transaction.onerror = function(event) {
            console.error('Transaction error:', event.target.errorCode);
        };
    };

    function createGradient(names) {
        // Her isim için orantılı renkli gradient oluşturur
        const percentage = 100 / names.length;
        let stops = [];
        names.forEach((name, idx) => {
            const color = colorMap[name] || 'var(--unchecked)';
            const start = Math.round(idx * percentage);
            const end = Math.round((idx + 1) * percentage);
            stops.push(`${color} ${start}%`, `${color} ${end}%`);
        });
        return `linear-gradient(90deg, ${stops.join(', ')})`;
    }

    // Export/Import fonksiyonları yıl bazlı çalışır
    window.exportData = function() {
        const transaction = db.transaction(['leaveDays'], 'readonly');
        const objectStore = transaction.objectStore('leaveDays');
        const request = objectStore.getAll();
        request.onsuccess = function(event) {
            const data = event.target.result.filter(item => item.year === selectedYear);
            const json = JSON.stringify(data);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const dateTimeString = `${selectedYear}_${day}-${month}-${year} ${hours}-${minutes}.json`;
            a.download = dateTimeString;
            a.click();
            URL.revokeObjectURL(url);
        };
        request.onerror = function(event) {
            console.error('Export error:', event.target.errorCode);
        };
    };
    


    // Import IndexedDB data
    window.importData = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const json = event.target.result;
            const data = JSON.parse(json);

            const transaction = db.transaction(['leaveDays'], 'readwrite');
            const objectStore = transaction.objectStore('leaveDays');

            data.forEach(item => {
                objectStore.put(item);
            });

            transaction.oncomplete = function() {
                alert('Veriler başarıyla içe aktarıldı!');
                loadLeaveDays();
            };

            transaction.onerror = function(event) {
                console.error('Import error:', event.target.errorCode);
            };
        };

        reader.readAsText(file);
    };

    window.deleteAllData = function() {
        if (confirm("Bütün Veriler Silinecek Emin Misin?")) {
            const request = indexedDB.deleteDatabase('CalendarDB');
            request.onsuccess = function() {
                alert('Bütün veriler silindi.');
                location.reload();
            };
            request.onerror = function(event) {
                console.error('Veri silme hatası:', event.target.errorCode);
            };
        }
    };

    window.deletealldatedata = function() {
        if (confirm("Bütün tarih verileri silinecek. Emin misiniz?")) {
            const transaction = db.transaction(['leaveDays'], 'readwrite');
            const objectStore = transaction.objectStore('leaveDays');
            const yearKey = `selectedDays_${selectedYear}`;
            const request = objectStore.delete(yearKey);
        
            request.onsuccess = function() {
                alert('Tüm tarih verileri silindi.');
                location.reload();
            };
        
            request.onerror = function(event) {
                console.error('Veri silme hatası:', event.target.errorCode);
            };
        }
    };
});















document.addEventListener('DOMContentLoaded', function() {
  const originalColors = {
    kontrol: getComputedStyle(document.documentElement).getPropertyValue('--kontrol'),
    osman: getComputedStyle(document.documentElement).getPropertyValue('--osman'),
    kadir: getComputedStyle(document.documentElement).getPropertyValue('--kadir'),
    elif: getComputedStyle(document.documentElement).getPropertyValue('--elif'),
    mustafa: getComputedStyle(document.documentElement).getPropertyValue('--mustafa'),
    bekir: getComputedStyle(document.documentElement).getPropertyValue('--bekir'),
    merve: getComputedStyle(document.documentElement).getPropertyValue('--merve'),
    hakan: getComputedStyle(document.documentElement).getPropertyValue('--hakan'),
    yigit: getComputedStyle(document.documentElement).getPropertyValue('--yigit'),
    ilhan: getComputedStyle(document.documentElement).getPropertyValue('--ilhan'),
    bahar: getComputedStyle(document.documentElement).getPropertyValue('--bahar'),
    seval: getComputedStyle(document.documentElement).getPropertyValue('--seval'),
    omer: getComputedStyle(document.documentElement).getPropertyValue('--omer'),
    tatil: getComputedStyle(document.documentElement).getPropertyValue('--tatil'),
    unchecked: getComputedStyle(document.documentElement).getPropertyValue('--unchecked')
  };

  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  updateColors(); // Initially set colors
  
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', updateColors);
  });
  
  // Function to update the root CSS variables
  function updateColors() {
    checkboxes.forEach((checkbox) => {
      const rootStyle = document.documentElement.style;
      if (checkbox.checked) {
        rootStyle.setProperty(`--${checkbox.id}`, originalColors[checkbox.id]);
      } else {
        rootStyle.setProperty(`--${checkbox.id}`, originalColors.unchecked);
      }
    });
  }
});






















// EKSTRA ÖZELLİKLER: Mouse Tekerleği ile Seçim Yapma
document.getElementById('name-select').addEventListener('wheel', function(event) {
    event.preventDefault();  // Tekerlek hareketinin sayfa kaymasını engeller

    var select = this;
    var options = select.options;
    var selectedIndex = select.selectedIndex;
    
    if (event.deltaY > 0) {
        // Mouse tekerleği aşağıya doğru hareket ettiğinde bir sonraki seçeneği seç
        if (selectedIndex < options.length - 1) {
            select.selectedIndex = selectedIndex + 1;
        }
    } else {
        // Mouse tekerleği yukarı doğru hareket ettiğinde bir önceki seçeneği seç
        if (selectedIndex > 0) {
            select.selectedIndex = selectedIndex - 1;
        }
    }

    // Wheel ile seçim değiştikten sonra 'change' olayını tetikle
    select.dispatchEvent(new Event('change'));
});

// Select ve label öğelerini al
const selectElement = document.getElementById('name-select');
const labelElement = document.querySelector('#remainingday-input label');

// Select kutusunda değişiklik olduğunda çalışacak olay dinleyicisi
selectElement.addEventListener('change', function() {
    // Seçilen değeri al
    const selectedValue = selectElement.value;
    
    // Label'ın içeriğini seçilen değerle güncelle
    if (selectedValue) {
        labelElement.textContent = selectedValue.toUpperCase(); // Seçilen değeri büyük harflerle yazdır
    } else {
        labelElement.textContent = "OSMAN"; // Varsayılan değeri geri getir
    }
});




// KONTROL CHECKED İSE HEPSİNİ SEÇER
document.getElementById('kontrol').addEventListener('change', function() {
    var checkboxes = document.querySelectorAll('.top.topleft input[type="checkbox"]');
    checkboxes.forEach(function(checkbox) {
        checkbox.checked = document.getElementById('kontrol').checked;
    });
    loadCheckedNames();
});

// BASLİIK TARİH DEĞİŞTİRME
document.querySelector(".baslik").innerHTML = ""; // Başlık artık dinamik

/* HAMBURGER MENU İCON */
function myFunction() {
    var element = document.querySelector("#navoff");
    element.classList.toggle("active");
    var panel = document.getElementById("solgraypanel");
    if (element.classList.contains("active")) {
      panel.style.left = "0px";
    } else {
      panel.style.left = "-350px";
    }
};
/* HAMBURGER MENU İCON */

