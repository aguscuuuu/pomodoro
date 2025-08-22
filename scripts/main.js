document.addEventListener('DOMContentLoaded', () => {  

    // elementos del dom
    const dateElement = document.querySelector('.date');
    const dayElement = document.querySelector('.day');
    const hourElement = document.querySelector('.hour');
    const clockElement = document.querySelector('.clock');
    const pomodoroCardElement = document.querySelector('.pomodoro-card');
    const durationInput = document.getElementById('duration');
    const breakInput = document.getElementById('break');
    const startButton = document.querySelector('.button-start');
    const restartButton = document.querySelector('.button-restart');
    const forwardButton = document.querySelector('.button-forward');
    const iconSpan = startButton.querySelector('.icon');
    const sonido = document.getElementById('alarm-sound');
    const progressBar = document.querySelector('.progress-bar');
    const modeLabel = document.querySelector('.mode-label');
    const volumeSlider = document.getElementById('volume');
    const savedVolume = localStorage.getItem('pomodoro-volume');
    const longBreakInput = document.getElementById('long-break');
    const pomodoroCounterElement = document.querySelector('.pomodoro-counter');


    // iconos svg
    const svgPlay = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="36" height="36"><polygon points="6,4 20,12 6,20" /></svg>`;
    const svgPause = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="36" height="36"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

    // estados del temporizador
    let timerInterval = null;
    let isWorking = true;
    let isRunning = false;
    let timeRemaining = 0;

    // cargar configuración inicial desde config.json
    fetch("data/config.json")
        .then(res => res.json())
        .then(config => {
            // restaurar datos del localstorage si existen
            const savedDuration = localStorage.getItem('pomodoro-duration');
            const savedBreak = localStorage.getItem('pomodoro-break');

            durationInput.value = savedDuration !== null ? savedDuration : config.duration;
            breakInput.value = savedBreak !== null ? savedBreak : config.break;

            timeRemaining = getInputMinutes(durationInput) * 60;

            // inicialización
            sonido.load();
            iconSpan.innerHTML = svgPlay;
            updateClock();
            updateDateTime();
            updateProgressBar();
            inicializarEventos();
        }
    )
        .catch(err => {
            console.error("Error al cargar config.json:", err);
        }
    );

    // función que agrupa todos los listeners y lógica principal
    function inicializarEventos() {
        // eventos
        startButton.addEventListener('click', toggleTimer);
        restartButton.addEventListener('click', () => {
            animarBoton(restartButton);
            restartTimer();
        }
    );
        forwardButton.addEventListener('click', () => {
            animarBoton(forwardButton);
            skipMode();
        }
    );

        durationInput.addEventListener('input', () => {
            limitarLargoInput(durationInput);
            limitarValor(durationInput, 50);
            localStorage.setItem('pomodoro-duration', durationInput.value);

            if (!isRunning && isWorking && durationInput.value !== '') {
                timeRemaining = getInputMinutes(durationInput) * 60;
                updateClock();
                updateProgressBar();
                actualizarFondo();
            }
        }
    );

        durationInput.addEventListener('blur', () => {
            const val = parseInt(durationInput.value, 10);
            if (isNaN(val) || val < 1) {
                durationInput.value = '1';
            }
            localStorage.setItem('pomodoro-duration', durationInput.value);

            if (!isRunning && isWorking) {
                timeRemaining = getInputMinutes(durationInput) * 60;
                updateClock();
                updateProgressBar();
                actualizarFondo();
            }
        });

        longBreakInput.addEventListener('input', () => {
            limitarLargoInput(longBreakInput);
            limitarValor(longBreakInput, 30);
            localStorage.setItem('pomodoro-long-break', longBreakInput.value);
        });
        longBreakInput.addEventListener('blur', () => {
            let val = parseInt(longBreakInput.value, 10);
            if (isNaN(val) || val < 0) val = 0;       // mínimo 0
            if (val > 30) val = 30;                    // máximo 30
            longBreakInput.value = val;
            localStorage.setItem('pomodoro-long-break', val);
        });

        
        breakInput.addEventListener('input', () => {
            limitarLargoInput(breakInput);
            limitarValor(breakInput, 25);
            localStorage.setItem('pomodoro-break', breakInput.value);

            if (!isRunning && !isWorking && breakInput.value !== '') {
                timeRemaining = getInputMinutes(breakInput) * 60;
                updateClock();
                updateProgressBar();
                actualizarFondo();
            }
        });
        breakInput.addEventListener('blur', () => {
            const val = parseInt(breakInput.value, 10);
            if (isNaN(val) || val < 0) breakInput.value = '0';
            localStorage.setItem('pomodoro-break', breakInput.value);

            if (!isRunning && !isWorking) {
                timeRemaining = getInputMinutes(breakInput) * 60;
                updateClock();
                updateProgressBar();
                actualizarFondo();
            }
        });

        const savedLongBreak = localStorage.getItem('pomodoro-long-break');
        longBreakInput.value = savedLongBreak !== null ? savedLongBreak : 15;

        durationInput.addEventListener('keydown', bloquearCaracteresInvalidos);
        breakInput.addEventListener('keydown', bloquearCaracteresInvalidos);
        durationInput.addEventListener('paste', validarPegado);
        breakInput.addEventListener('paste', validarPegado);
        longBreakInput.addEventListener('keydown', bloquearCaracteresInvalidos);
        longBreakInput.addEventListener('paste', validarPegado);

        // teclas espacio o enter para iniciar/detener
        document.addEventListener('keydown', (e) => {
            const isTyping = document.activeElement === durationInput || document.activeElement === breakInput;
            if (isTyping) return;
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                toggleTimer();
            }
        });

        // agrega la animación inicial al cargar la tarjeta del pomodoro
        pomodoroCardElement.classList.add('animate__animated', 'animate__fadeInDownBig');
        setTimeout(() => {
            pomodoroCardElement.classList.remove('animate__fadeInDownBig');
        }, 1000);

        // valor inicial volumen
        volumeSlider.value = 0.9;
        sonido.volume = ajustarVolumen(0.80);

        // cargar volumen desde localstorage si existe
        if (savedVolume !== null) {
            volumeSlider.value = savedVolume;
            sonido.volume = ajustarVolumen(parseFloat(savedVolume));
        }

        // actualizar volumen mientras se mueve
        volumeSlider.addEventListener('input', () => {
            const linear = parseFloat(volumeSlider.value);
            sonido.volume = ajustarVolumen(linear);
            localStorage.setItem('pomodoro-volume', linear);
            actualizarColorBarraVolumen(linear);
        });

        // probar sonido al soltar la barra
        volumeSlider.addEventListener('change', () => {
            sonido.pause();
            sonido.currentTime = 0;
            sonido.play().catch(err => console.warn("Error al reproducir sonido de prueba:", err));
        });

        actualizarColorBarraVolumen(volumeSlider.value);
    }

    // cambia entre iniciar y pausar el temporizador
    function toggleTimer() {
        const minutos = isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput);
        if (minutos === 0) return;

        if (!isRunning) {
            // Si ya terminó, reinicia al tiempo correspondiente
            if (timeRemaining <= 0) {
                timeRemaining = minutos * 60;
            }
            isRunning = true;
            startButton.classList.add('active');
            animarIcono(svgPause);
            actualizarFondo();
            clearInterval(timerInterval); // asegurarse de limpiar intervalos previos
            timerInterval = setInterval(tick, 1000);
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            startButton.classList.remove('active');
            animarIcono(svgPlay);
            actualizarFondo();
        }
    }

    // reinicia el temporizador al tiempo inicial según el modo actual
    function restartTimer() {
        clearInterval(timerInterval);

        switch(mode) {
            case 'work':
                timeRemaining = getInputMinutes(durationInput) * 60;
                break;
            case 'shortBreak':
                timeRemaining = getInputMinutes(breakInput, 0) * 60;
                break;
            case 'longBreak':
                timeRemaining = getInputMinutes(longBreakInput, 0) * 60;
                break;
        }

        updateClock();
        updateProgressBar();

        if (isRunning) {
            actualizarFondo();
            timerInterval = setInterval(tick, 1000);
        } else {
            document.body.classList.remove('working', 'breaking');
        }
    }


    // Si quieres que el botón de adelantar también respete la lógica del descanso largo:
    function skipMode() {
        switch(mode) {
            case 'work':
                pomodoroCount++;
                updatePomodoroCounter();
                if (pomodoroCount < 4) {
                    mode = 'shortBreak';
                    timeRemaining = getInputMinutes(breakInput, 0) * 60;
                } else {
                    mode = 'longBreak';
                    timeRemaining = getInputMinutes(longBreakInput, 0) * 60;
                    pomodoroCount = 0;
                }
                break;

            case 'shortBreak':
                mode = 'work';
                timeRemaining = getInputMinutes(durationInput) * 60;
                break;

            case 'longBreak':
                mode = 'work';
                timeRemaining = getInputMinutes(durationInput) * 60;
                break;
        }

        // actualizar estado según modo
        isWorking = (mode === 'work');

        // actualizar reloj, barra de progreso y color
        updateClock();
        updateProgressBar();
        actualizarFondo(); // esta función ya llama a actualizarColorBarra internamente
        actualizarModoLabel();
    }


    // actualiza el reloj mostrando el tiempo restante en formato mm:ss y el título de la página
    function updateClock() {
        const tiempo = formatTime(timeRemaining);
        clockElement.textContent = tiempo;

        if (isRunning) {
            const estado = isWorking ? 'Estudiando...' : 'Descansando...';
            document.title = `${tiempo} | ${estado}`;
        } else {
            document.title = 'Reloj Pomodoro';
        }
    }

    function updateProgressBar() {
        let total;
        if (mode === 'work') {
            total = getInputMinutes(durationInput) * 60;
        } else if (mode === 'shortBreak') {
            total = getInputMinutes(breakInput, 0) * 60;
        } else if (mode === 'longBreak') {
            total = getInputMinutes(longBreakInput, 0) * 60;
        }

        const porcentaje = ((total - timeRemaining) / total) * 100;
        progressBar.style.width = `${porcentaje}%`;
    }


    function actualizarFondo() {
        
        updateProgressBar();
        actualizarColorBarra(isWorking ? 'working' : 'breaking');

        document.body.classList.remove('working', 'breaking');

        if (!isRunning) {
            modeLabel.textContent = isWorking ? 'Tiempo de estudiar...' : 'Tiempo de descansar...';
            return;
        }

        if (isWorking) {
            document.body.classList.add('working');
            actualizarColorBarra('working');
        } else {
            document.body.classList.add('breaking');
            actualizarColorBarra('breaking');
        }

        actualizarModoLabel();
    }

    function actualizarColorBarra(modo) {
        const container = document.querySelector('.progress-bar-container');

        if (modo === 'working') {
            container.style.backgroundColor = '#0f3d5a';
            progressBar.style.backgroundColor = '#ca5c3b';
        } else {
            container.style.backgroundColor = '#ca5c3b';
            progressBar.style.backgroundColor = '#0f3d5a';
        }
    }

    function getInputMinutes(input, min = 1) {
        const val = parseInt(input.value, 10);
        // si es un input de descanso largo o corto, min = 0
        if (input === breakInput || input === longBreakInput) min = 0;
        return isNaN(val) || val < min ? min : val;
    }


    function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function animarIcono(svg) {
        iconSpan.style.opacity = 0;
        setTimeout(() => {
            iconSpan.innerHTML = svg;
            iconSpan.style.opacity = 1;
        }, 200);
    }

    function animarBoton(boton) {
        boton.classList.remove('shrink');
        void boton.offsetWidth;
        boton.classList.add('shrink');
    }

    function reproducirAlarma() {
        sonido.pause();
        sonido.currentTime = 0;

        sonido.play()
            .then(() => {
                return new Promise(resolve => {
                    sonido.onended = () => {
                        sonido.onended = null;
                        resolve();
                    };
                });
            })
            .then(() => {
                sonido.currentTime = 0;
                return sonido.play();
            })
            .catch(err => console.warn("Error al reproducir la alarma:", err));
    }

    function animarCard() {
        reproducirAlarma();

        pomodoroCardElement.classList.remove('animate__animated', 'animate__fadeInDown', 'animate__shakeX');
        void pomodoroCardElement.offsetWidth;
        pomodoroCardElement.classList.add('animate__animated', 'animate__shakeX');

        setTimeout(() => {
            pomodoroCardElement.classList.remove('animate__animated', 'animate__shakeX');
        }, 1000);
    }

    function updateDateTime() {
        const hoy = new Date();
        const dias = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

        const dia = hoy.getDate().toString().padStart(2, '0');
        const mes = (hoy.getMonth() + 1).toString().padStart(2, '0'); // +1 porque los meses van de 0 a 11
        const anio = hoy.getFullYear();

        dateElement.textContent = `${dia}/${mes}/${anio}`;
        dayElement.textContent = dias[hoy.getDay()];

        function actualizarHora() {
            const ahora = new Date();
            hourElement.textContent = ahora.toLocaleTimeString('es-AR', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        actualizarHora();
        setInterval(actualizarHora, 1000);
    }


    function limitarLargoInput(input) {
        if (input.value.length > 2) {
            input.value = input.value.slice(0, 2);
        }
    }

    function limitarValor(input, max) {
        const val = parseInt(input.value, 10);
        if (!isNaN(val) && val > max) input.value = max;
    }

    function bloquearCaracteresInvalidos(e) {
        const k = e.key;
        const valid = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
        if (!/^\d$/.test(k) && !valid.includes(k)) e.preventDefault();
    }

    function validarPegado(e) {
        const txt = (e.clipboardData || window.clipboardData).getData('text');
        if (!/^\d+$/.test(txt)) e.preventDefault();
    }

    function actualizarModoLabel() {
        switch(mode) {
            case 'work':
                modeLabel.textContent = 'Tiempo de estudiar...';
                break;
            case 'shortBreak':
                modeLabel.textContent = 'Tiempo de descansar...';
                break;
            case 'longBreak':
                modeLabel.textContent = 'Descanso largo...';
                break;
        }
    }



    function ajustarVolumen(linearValue) {
        return Math.pow(linearValue, 2);
    }

    function actualizarColorBarraVolumen(valor) {
        const porcentaje = valor * 100;
        volumeSlider.style.background = `linear-gradient(to right, #e77c5b ${porcentaje}%, #f5c6b1 ${porcentaje}%)`;
    }

    let mode = 'work'; // modos: 'work', 'shortBreak', 'longBreak'
    let pomodoroCount = 0;
    updatePomodoroCounter();
    function tick() {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateClock();
            updateProgressBar();
        } else {
            reproducirAlarma();
            animarCard();

            if (mode === 'work') {
                pomodoroCount++;
                
                if (pomodoroCount < 4) {
                    // Pomodoros 1,2,3 → descanso corto
                    mode = 'shortBreak';
                    timeRemaining = getInputMinutes(breakInput, 0) * 60;
                } else {
                    // Pomodoro 4 → descanso largo Y reiniciar contador
                    mode = 'longBreak';
                    timeRemaining = getInputMinutes(longBreakInput, 0) * 60;
                    pomodoroCount = 0; // Reiniciar contador inmediatamente
                }
                updatePomodoroCounter(); // Actualizar display UNA sola vez
            } else if (mode === 'shortBreak') {
                // Después de descanso corto → Pomodoro
                mode = 'work';
                timeRemaining = getInputMinutes(durationInput) * 60;
            } else if (mode === 'longBreak') {
                // Después de descanso largo → volver al primer pomodoro
                mode = 'work';
                timeRemaining = getInputMinutes(durationInput) * 60;
                // pomodoroCount ya es 0 en este punto
            }

            isWorking = (mode === 'work');
            updateClock();
            updateProgressBar();
            actualizarFondo();
            actualizarModoLabel();
        }
    }


    function updatePomodoroCounter() {
        pomodoroCounterElement.textContent = `Pomodoros: ${pomodoroCount}`;
    }


});
