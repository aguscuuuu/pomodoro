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

    // iconos svg
    const svgPlay = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="36" height="36"><polygon points="6,4 20,12 6,20" /></svg>`;
    const svgPause = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="36" height="36"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

    // estados del temporizador
    let timerInterval = null;
    let isWorking = true;
    let isRunning = false;

    // restaurar datos del localstorage si existen
    const savedDuration = localStorage.getItem('pomodoro-duration');
    const savedBreak = localStorage.getItem('pomodoro-break');

    if (savedDuration !== null) durationInput.value = savedDuration;
    if (savedBreak !== null) breakInput.value = savedBreak;

    let timeRemaining = getInputMinutes(durationInput) * 60;

    sonido.load();
    iconSpan.innerHTML = svgPlay;
    updateClock();
    updateDateTime();
    updateProgressBar();

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
        limitarLargoInput(durationInput);
        limitarValor(durationInput, 50);
        localStorage.setItem('pomodoro-duration', durationInput.value);

        if (!isRunning && isWorking && durationInput.value !== '') {
            timeRemaining = getInputMinutes(durationInput) * 60;
            updateClock();
            updateProgressBar();
            actualizarFondo();
        }
    });

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

    durationInput.addEventListener('keydown', bloquearCaracteresInvalidos);
    breakInput.addEventListener('keydown', bloquearCaracteresInvalidos);
    durationInput.addEventListener('paste', validarPegado);
    breakInput.addEventListener('paste', validarPegado);

    // teclas espacio o enter para iniciar/detener
    document.addEventListener('keydown', (e) => {
        const isTyping = document.activeElement === durationInput || document.activeElement === breakInput;
        if (isTyping) return;
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            toggleTimer();
        }
    });

    // cambia entre iniciar y pausar el temporizador
    function toggleTimer() {
        const minutos = isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput);
        if (minutos === 0) return;

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
            actualizarFondo();
            animarIcono(svgPlay);
        }
    }

    // reinicia el temporizador al tiempo inicial según el modo actual
    function restartTimer() {
        clearInterval(timerInterval);
        timeRemaining = (isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput)) * 60;
        updateClock();
        updateProgressBar();

        if (isRunning) {
            actualizarFondo();
            timerInterval = setInterval(tick, 1000);
        } else {
            document.body.classList.remove('working', 'breaking');
        }
    }

    // cambia el modo entre trabajo y descanso, reiniciando el tiempo restante
    function skipMode() {
        isWorking = !isWorking;
        timeRemaining = (isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput)) * 60;
        updateClock();
        updateProgressBar();
        actualizarFondo();
    }

    // función que se ejecuta cada segundo para actualizar el temporizador
    function tick() {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateClock();
            updateProgressBar();
        } else {
            progressBar.style.width = '100%';

            reproducirAlarma();
            animarCard();
            clearInterval(timerInterval);
            isRunning = false;
            animarIcono(svgPlay);
            updateClock();

            setTimeout(() => {
                isWorking = !isWorking;
                const minutos = isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput);
                timeRemaining = minutos * 60;
                updateClock();
                updateProgressBar();
                isRunning = true;
                actualizarFondo();
                animarIcono(svgPause);
                timerInterval = setInterval(tick, 1000);
            }, 3000);
        }
    }

    // agrega la animación inicial al cargar la tarjeta del pomodoro
    pomodoroCardElement.classList.add('animate__animated', 'animate__fadeInDown');
    setTimeout(() => {
        pomodoroCardElement.classList.remove('animate__fadeInDown');
    }, 1000);

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

    // actualiza la barra de progreso según el porcentaje completado del temporizador
    function updateProgressBar() {
        const total = (isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput)) * 60;
        const porcentaje = ((total - timeRemaining) / total) * 100;
        progressBar.style.width = `${porcentaje}%`;
    }

    // actualiza el fondo y colores según el estado del temporizador y el modo actual
    function actualizarFondo() {
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

    // cambia los colores de la barra de progreso y su contenedor según el modo
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

    // obtiene el valor numérico del input asegurando que sea mínimo 1
    function getInputMinutes(input) {
        const val = parseInt(input.value, 10);
        return isNaN(val) || val < 1 ? 1 : val;
    }

    // convierte segundos a formato mm:ss para mostrar en el reloj
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // anima el icono del botón de inicio/pausa con un fade
    function animarIcono(svg) {
        iconSpan.style.opacity = 0;
        setTimeout(() => {
            iconSpan.innerHTML = svg;
            iconSpan.style.opacity = 1;
        }, 200);
    }

    // anima un botón con una pequeña contracción al hacer clic
    function animarBoton(boton) {
        boton.classList.remove('shrink');
        void boton.offsetWidth;
        boton.classList.add('shrink');
    }

    // reproduce el sonido de alarma, manejando posibles errores
    function reproducirAlarma() {
        sonido.pause();
        sonido.currentTime = 0;
        sonido.play().catch(err => console.warn("Error al reproducir alarma:", err));
    }

    // anima la tarjeta del pomodoro con un efecto de sacudida y reproduce la alarma
    function animarCard() {
        reproducirAlarma();

        pomodoroCardElement.classList.remove('animate__animated', 'animate__fadeInDown', 'animate__shakeX');
        void pomodoroCardElement.offsetWidth;
        pomodoroCardElement.classList.add('animate__animated', 'animate__shakeX');

        setTimeout(() => {
            pomodoroCardElement.classList.remove('animate__animated', 'animate__shakeX');
        }, 1000);
    }

    // actualiza la fecha, día y hora en la interfaz, refrescando la hora cada segundo
    function updateDateTime() {
        const hoy = new Date();
        const dias = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
        dateElement.textContent = hoy.toLocaleDateString('es-AR');

        // solo la primera letra del día en mayúscula
        const dia = dias[hoy.getDay()];
        dayElement.textContent = dias[hoy.getDay()];

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

    // limita el largo del valor del input a máximo 2 caracteres
    function limitarLargoInput(input) {
        if (input.value.length > 2) {
            input.value = input.value.slice(0, 2);
        }
    }

    // limita el valor numérico máximo del input según el parámetro max
    function limitarValor(input, max) {
        const val = parseInt(input.value, 10);
        if (!isNaN(val) && val > max) input.value = max;
    }

    // bloquea la entrada de caracteres no numéricos en los inputs
    function bloquearCaracteresInvalidos(e) {
        const k = e.key;
        const valid = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
        if (!/^\d$/.test(k) && !valid.includes(k)) e.preventDefault();
    }

    // valida que al pegar solo se permita texto numérico en los inputs
    function validarPegado(e) {
        const txt = (e.clipboardData || window.clipboardData).getData('text');
        if (!/^\d+$/.test(txt)) e.preventDefault();
    }

    // actualiza el texto del label que indica el modo actual
    function actualizarModoLabel() {
        modeLabel.textContent = isWorking ? 'Tiempo de estudiar...' : 'Tiempo de descansar...';
    }
});
