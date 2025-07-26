document.addEventListener('DOMContentLoaded', () => {
    // elementos del dom
    const dateElement = document.querySelector('.date');
    const dayElement = document.querySelector('.day');
    const hourElement = document.querySelector('.hour');
    const clockElement = document.querySelector('.clock');
    const durationInput = document.getElementById('duration');
    const breakInput = document.getElementById('break');
    const startButton = document.querySelector('.button-start');
    const restartButton = document.querySelector('.button-restart');
    const forwardButton = document.querySelector('.button-forward');
    const iconSpan = startButton.querySelector('.icon');
    const sonido = document.getElementById('alarm-sound');

    // iconos svg
    const svgPlay = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="36" height="36"><polygon points="6,4 20,12 6,20" /></svg>`;
    const svgPause = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="36" height="36"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

    // estados del temporizador
    let timerInterval = null;
    let isWorking = true;
    let isRunning = false;
    let timeRemaining = getInputMinutes(durationInput) * 60;

    sonido.load();
    iconSpan.innerHTML = svgPlay;
    updateClock();
    updateDateTime();

    // eventos
    startButton.addEventListener('click', toggleTimer);
    restartButton.addEventListener('click', () => {
        animarBoton(restartButton);
        restartTimer();
    });
    forwardButton.addEventListener('click', () => {
        animarBoton(forwardButton);
        skipMode();
    }); 

    durationInput.addEventListener('input', () => {
        // Limitar longitud a 2 caracteres
        if (durationInput.value.length > 2) {
            durationInput.value = durationInput.value.slice(0, 2);
        }

        // Limitar máximo 50
        const val = parseInt(durationInput.value, 10);
        if (!isNaN(val) && val > 50) {
            durationInput.value = '50';
        }

        // Permitimos que el campo quede vacío para que el usuario escriba
        // Solo actualizamos el reloj si no está corriendo y es modo pomodoro
        if (!isRunning && isWorking && durationInput.value !== '') {
            timeRemaining = getInputMinutes(durationInput) * 60;
            updateClock();
            actualizarFondo();
        }
    });

    durationInput.addEventListener('blur', () => {
        // Al perder foco, corregir valor a mínimo 1 si está vacío o menor a 1
        const val = parseInt(durationInput.value, 10);
        if (isNaN(val) || val < 1) {
            durationInput.value = '1';
        }

        if (!isRunning && isWorking) {
            timeRemaining = getInputMinutes(durationInput) * 60;
            updateClock();
            actualizarFondo();
        }
    });

    breakInput.addEventListener('input', () => {
        limitarLargoInput(breakInput);
        limitarValor(breakInput, 25);
        if (!isRunning && !isWorking) {
            timeRemaining = getInputMinutes(breakInput) * 60;
            updateClock();
            actualizarFondo();
        }
    });

    durationInput.addEventListener('keydown', bloquearCaracteresInvalidos);
    durationInput.addEventListener('paste', validarPegado);
    breakInput.addEventListener('keydown', bloquearCaracteresInvalidos);
    breakInput.addEventListener('paste', validarPegado);

    function toggleTimer() {
        const minutos = isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput);
        if (minutos === 0) {
            return;
        }

        if (!isRunning) {
            if (timeRemaining === 0) {
                timeRemaining = minutos * 60;
            }
            isRunning = true;
            actualizarFondo();
            animarIcono(svgPause);
            timerInterval = setInterval(tick, 1000);
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            document.body.classList.remove('working', 'breaking');
            animarIcono(svgPlay);
        }
    }

    function restartTimer() {
        clearInterval(timerInterval);
        timeRemaining = (isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput)) * 60;
        updateClock();
        if (isRunning) {
            actualizarFondo();
            timerInterval = setInterval(tick, 1000);
        } else {
            document.body.classList.remove('working', 'breaking');
        }
    }

    function skipMode() {
        isWorking = !isWorking;
        timeRemaining = (isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput)) * 60;
        updateClock();
        actualizarFondo();
    }

    function tick() {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateClock();
        } else {
            reproducirAlarma();
            animarReloj();
            clearInterval(timerInterval);
            isRunning = false;
            animarIcono(svgPlay);
            updateClock();

            setTimeout(() => {
                isWorking = !isWorking;
                const minutos = isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput);
                timeRemaining = minutos * 60;
                updateClock();
                isRunning = true;
                actualizarFondo();
                animarIcono(svgPause);
                timerInterval = setInterval(tick, 1000);
            }, 3000);
        }
    }

    function actualizarFondo() {
        document.body.classList.remove('working', 'breaking');
        if (isRunning) {
            document.body.classList.add(isWorking ? 'working' : 'breaking');
        }
    }

    function updateClock() {
        clockElement.textContent = formatTime(timeRemaining);
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function getInputMinutes(input) {
        const val = parseInt(input.value, 10);
        return isNaN(val) || val < 1 ? 1 : val;
    }

    function animarIcono(svg) {
        iconSpan.style.opacity = 0;
        setTimeout(() => {
            iconSpan.innerHTML = svg;
            iconSpan.style.opacity = 1;
        }, 200);
    }

    function reproducirAlarma() {
        sonido.pause();
        sonido.currentTime = 0;
        sonido.play().catch(err => console.warn("Error al reproducir alarma:", err));
    }

    function animarReloj() {
        reproducirAlarma();
        clockElement.classList.remove('animate__animated', 'animate__shakeX');
        void clockElement.offsetWidth;
        clockElement.classList.add('animate__animated', 'animate__shakeX');
        setTimeout(() => {
            clockElement.classList.remove('animate__animated', 'animate__shakeX');
            void clockElement.offsetWidth;
            clockElement.classList.add('animate__animated', 'animate__shakeX');
        }, 1000);
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

    function updateDateTime() {
        const hoy = new Date();
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        dateElement.textContent = hoy.toLocaleDateString('es-AR');
        dayElement.textContent = dias[hoy.getDay()].toUpperCase();

        function actualizarHora() {
            const ahora = new Date();
            hourElement.textContent = ahora.toLocaleTimeString('es-AR', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        actualizarHora();
        setInterval(actualizarHora, 1000);
    }
    
    function animarBoton(boton) {
        boton.classList.remove('shrink');
        void boton.offsetWidth; // Forzar reflujo para reiniciar animación
        boton.classList.add('shrink');
    }
});
