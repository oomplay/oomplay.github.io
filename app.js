        let windowsData = {};
        let topZIndex = 1001;
        let activeWindowId = null;

        const windowManager = new Map();

        const terminalState = {
            history: [],
            historyIndex: -1,
            pingIntervals: new Map(),
            htopInterval: null
        };

        function createElement(tag, className, text) {
            const el = document.createElement(tag);
            if (className) el.className = className;
            if (text !== undefined) el.textContent = text;
            return el;
        }

        function showNotification(message, type = 'warning') {
            const notification = createElement('div', `notification ${type}`);
            notification.setAttribute('role', 'status');
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => notification.remove(), 300);
            }, 5000);
        }

        function createParticles() {
            const container = document.getElementById('particles');
            const particleCount = 20;

            for (let i = 0; i < particleCount; i++) {
                const particle = createElement('div', 'particle');
                particle.style.left = Math.random() * 100 + '%';
                particle.style.width = (Math.random() * 15 + 5) + 'px';
                particle.style.height = particle.style.width;
                particle.style.animationDelay = Math.random() * 15 + 's';
                particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
                particle.style.opacity = Math.random() * 0.5 + 0.1;
                container.appendChild(particle);
            }
        }

        function createRipple(event, element) {
            const ripple = createElement('span', 'ripple');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = event.clientX - rect.left - size / 2 + 'px';
            ripple.style.top = event.clientY - rect.top - size / 2 + 'px';

            element.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        }

        function renderTerminalMarkup() {
            return `
                <div class="terminal-shell" id="terminal-container">
                    <div class="terminal-controls">
                        <div style="background:#f38ba8;"></div>
                        <div style="background:#fab387;"></div>
                        <div style="background:#a6e3a1;"></div>
                    </div>
                    <div id="terminal-output" class="terminal-output" role="log" aria-label="Terminal output"></div>
                    <div class="terminal-input-line">
                        <span class="terminal-prompt" aria-hidden="true">[oom@linux ~]$ </span>
                        <input type="text" id="terminal-input" aria-label="Terminal input" autocomplete="off" spellcheck="false" />
                    </div>
                </div>
            `;
        }

        function buildWindowsData() {
            windowsData = {
                terminal: {
                    title: 'Terminal',
                    render(container) {
                        const wrap = createElement('div');
                        wrap.style.cssText = `
                            height: 100%;
                            display: flex;
                            flex-direction: column;
                            min-width: 0;
                        `;

                        wrap.innerHTML = renderTerminalMarkup();
                        container.appendChild(wrap);
                    }
                }
            };
        }


        function setDockState(windowId, { running, active }) {
            const icon = document.querySelector(`.dash-icon[data-window="${windowId}"]`);
            if (!icon) return;
            icon.classList.toggle('running', !!running);
            icon.classList.toggle('active', !!active);
        }

        function refreshDockStates() {
            document.querySelectorAll('.dash-icon').forEach(icon => {
                const id = icon.dataset.window;
                const win = windowManager.get(id);
                const running = !!win;
                const active = running && activeWindowId === id && !win.hidden;
                setDockState(id, { running, active });
            });
        }

        function clampWindowPosition(element) {
            const rect = element.getBoundingClientRect();
            const maxLeft = Math.max(0, window.innerWidth - rect.width);
            const maxTop = Math.max(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) + 4, 0);
            const bottomLimit = Math.max(maxTop, window.innerHeight - 80 - rect.height);

            let left = parseFloat(element.style.left) || rect.left;
            let top = parseFloat(element.style.top) || rect.top;

            left = Math.max(0, Math.min(left, maxLeft));
            top = Math.max(maxTop, Math.min(top, bottomLimit));

            element.style.left = left + 'px';
            element.style.top = top + 'px';
        }

        class GnomeWindow {
            constructor(id) {
                this.id = id;
                this.element = null;
                this.hidden = false;
                this.maximized = false;
                this.restoreState = null;
                this.create();
            }

            create() {
    const meta = windowsData[this.id];
    if (!meta) return;

    this.element = createElement('div', 'window');
    this.element.dataset.windowId = this.id;

    const topbar = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')
    ) || 48;

    const safeBottom = 100;

    const width = Math.min(window.innerWidth * 0.72, 960);
    const height = Math.min(
        window.innerHeight * 0.68,
        window.innerHeight - topbar - safeBottom
    );

    const left = Math.max((window.innerWidth - width) / 2, 20);
    const top = Math.max((window.innerHeight - height) / 2, topbar + 16);

    this.element.style.width = `${width}px`;
    this.element.style.height = `${height}px`;
    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
    this.element.style.zIndex = ++topZIndex;

    const titleBar = createElement('div', 'title-bar');

    const controls = createElement('div', 'window-controls');

    const closeBtn = createElement('button', 'control-btn close-gnome');
    closeBtn.type = 'button';
    closeBtn.title = 'Close';
    closeBtn.setAttribute('aria-label', 'Close window');

    const minBtn = createElement('button', 'control-btn minimize-gnome');
    minBtn.type = 'button';
    minBtn.title = 'Minimize';
    minBtn.setAttribute('aria-label', 'Minimize window');

    const maxBtn = createElement('button', 'control-btn maximize-gnome');
    maxBtn.type = 'button';
    maxBtn.title = 'Maximize';
    maxBtn.setAttribute('aria-label', 'Maximize window');

    controls.append(closeBtn, minBtn, maxBtn);

    const title = createElement('div', 'window-title-gnome', meta.title);
    const content = createElement('div', 'window-content');

    meta.render(content);

    titleBar.append(controls, title);
    this.element.append(titleBar, content);
    document.body.appendChild(this.element);

    closeBtn.addEventListener('click', () => this.close());
    minBtn.addEventListener('click', () => this.minimize());
    maxBtn.addEventListener('click', () => this.toggleMaximize());

    this.element.addEventListener('mousedown', () => this.bringToFront());
    this.element.addEventListener('pointerdown', () => this.bringToFront());
}


            bringToFront() {
                activeWindowId = this.id;
                this.element.style.zIndex = ++topZIndex;

                document.querySelectorAll('.window').forEach(win => {
                    win.classList.remove('focused');
                });

                this.element.classList.add('focused');
                refreshDockStates();
            }

            show() {
                this.hidden = false;
                this.element.classList.remove('hidden');
                this.bringToFront();

                if (this.id === 'terminal') {
                    setTimeout(() => initTerminal(), 50);
                }
            }

            minimize() {
                this.hidden = true;
                this.element.classList.add('hidden');
                if (activeWindowId === this.id) {
                    activeWindowId = null;
                }
                this.element.classList.remove('focused');
                refreshDockStates();
            }

            toggleMaximize() {
    if (!this.maximized) {
        this.restoreState = {
            left: this.element.style.left,
            top: this.element.style.top,
            width: this.element.style.width,
            height: this.element.style.height,
            maxWidth: this.element.style.maxWidth,
            maxHeight: this.element.style.maxHeight
        };

        const topbar = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')
        ) || 48;

        this.element.style.left = '20px';
        this.element.style.top = `${topbar + 16}px`;
        this.element.style.width = 'calc(100vw - 40px)';
        this.element.style.height = `calc(100dvh - ${topbar + 110}px)`;
        this.element.style.maxWidth = 'none';
        this.element.style.maxHeight = 'none';
        this.maximized = true;
    } else {
        const s = this.restoreState || {};
        this.element.style.left = s.left || '20px';
        this.element.style.top = s.top || '64px';
        this.element.style.width = s.width || '';
        this.element.style.height = s.height || '';
        this.element.style.maxWidth = s.maxWidth || '';
        this.element.style.maxHeight = s.maxHeight || '';
        this.maximized = false;
    }

    this.bringToFront();
    clampWindowPosition(this.element);
}


            close() {
                this.element.remove();
                windowManager.delete(this.id);
                if (activeWindowId === this.id) activeWindowId = null;
                refreshDockStates();
                updateAppMenu();
            }
        }

        function updateClock() {
            const clockEl = document.getElementById('statusClock');
            if (!clockEl) return;

            clockEl.textContent = new Date().toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function scheduleClock() {
            updateClock();
            const now = new Date();
            const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
            setTimeout(() => {
                updateClock();
                setInterval(updateClock, 60000);
            }, msUntilNextMinute);
        }

        function updateAppMenu() {
            const appMenu = document.getElementById('appMenu');
            appMenu.innerHTML = '';

            const windows = Array.from(windowManager.values());
            if (!windows.length) {
                const item = createElement('button', 'app-item', 'No open apps');
                item.type = 'button';
                item.disabled = true;
                appMenu.appendChild(item);
                return;
            }

            windows
                .sort((a, b) => (parseInt(b.element.style.zIndex) || 0) - (parseInt(a.element.style.zIndex) || 0))
                .forEach(win => {
                    const item = createElement('button', 'app-item');
                    item.type = 'button';
                    item.textContent = win.element.querySelector('.window-title-gnome').textContent + (win.hidden ? ' (minimized)' : '');
                    item.addEventListener('click', () => {
                        win.show();
                        document.getElementById('appMenu').classList.remove('show');
                    });
                    appMenu.appendChild(item);
                });
        }
        
        function randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        // Types `lines` into the terminal with a short per-line delay to
        // mimic a real shell. "Network" steps (Get:/Fetched) wait longer.
        async function appendTerminalLines(output, cmd, lines) {
            const cmdLine = document.createElement('div');

            const prompt = document.createElement('span');
            prompt.style.cssText = 'color: #89b4fa;';
            prompt.textContent = '[oom@linux ~]$ ';

            const cmdText = document.createElement('span');
            cmdText.style.cssText = 'color: #f5c2e7;';
            cmdText.textContent = cmd;

            cmdLine.append(prompt, cmdText);
            output.appendChild(cmdLine);

            for (const line of lines) {
                const lineDiv = document.createElement('div');
                lineDiv.textContent = line;
                output.appendChild(lineDiv);
                output.scrollTop = output.scrollHeight;

                let delay = Math.random() * 120 + 60;

                if (line.startsWith('Get:') || line.includes('Fetched')) {
                    delay = Math.random() * 400 + 2000;
                }

                if (line.includes('Reading') || line.includes('Building') || line.includes('Calculating')) {
                    delay = Math.random() * 300 + 150;
                }

                await new Promise(resolve => setTimeout(resolve, delay));
            }

            output.appendChild(document.createElement('br'));
        }

function appendLiveLine(output, text, color = '#cdd6f4') {
    const line = document.createElement('div');
    line.style.cssText = `line-height: 1.6; font-size: 14px; white-space: pre-wrap; color: ${color};`;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
    return line;
}

function stopHtop() {
    if (terminalState.htopInterval) {
        clearInterval(terminalState.htopInterval);
        terminalState.htopInterval = null;
    }
}

function stopAllPing() {
    terminalState.pingIntervals.forEach(intervalId => clearInterval(intervalId));
    terminalState.pingIntervals.clear();
}

function generateHtopFrame() {
    const cpu = randomInt(18, 87);
    const ram = randomInt(34, 76);
    const swap = randomInt(1, 18);
    const tasks = randomInt(184, 241);
    const running = randomInt(2, 9);
    const load1 = (Math.random() * 2.5 + 0.2).toFixed(2);
    const load5 = (Math.random() * 2.2 + 0.2).toFixed(2);
    const load15 = (Math.random() * 2.0 + 0.2).toFixed(2);

    function bar(percent, size = 20) {
        const filled = Math.round((percent / 100) * size);
        return '█'.repeat(filled) + '░'.repeat(size - filled);
    }

    return `
htop - oom@linux
Tasks: ${tasks}, ${running} running
Load average: ${load1} ${load5} ${load15}

CPU  [${bar(cpu)}] ${cpu}%
MEM  [${bar(ram)}] ${ram}%
SWAP [${bar(swap)}] ${swap}%

 PID   USER   CPU%   MEM%   COMMAND
 812   oom    18.2    4.1   gnome-shell
 991   oom    12.8    2.4   firefox
1204   oom     6.4    1.8   gnome-terminal
1428   oom    22.6    6.3   code
1881   oom     3.2    0.9   pipewire
`;
}



        const terminalCommands = {
    help: () => ({
        type: 'text',
        value: `Available commands:
  help      - Show this help
  clear     - Clear terminal
  echo      - Echo text
  date      - Show current date/time
  whoami    - Show current user
  pwd       - Show current directory
  ls        - List files
  cat       - Read file
  neofetch  - Show system info
  uname     - System information
  uptime    - Show uptime
  cowsay    - Cow says something
  apt       - Simulate apt commands
  sudo      - Run command as superuser
  history   - Show command history
  ping      - Ping a host
  htop      - Interactive process viewer
  fortune   - Show random quote
  exit      - Stop live commands`
    }),

    clear: () => {
        stopHtop();
        stopAllPing();
        return { type: 'clear' };
    },

    echo: (args) => ({ type: 'text', value: args.join(' ') }),
    date: () => ({ type: 'text', value: new Date().toString() }),
    whoami: () => ({ type: 'text', value: 'oom' }),
    pwd: () => ({ type: 'text', value: '/home/oom' }),

    ls: () => ({
        type: 'text',
        value: 'Desktop  Documents  Downloads  Music  Pictures  Videos  .bashrc  .bash_profile  .config'
    }),

    cat: (args) => {
        if (args[0] === '.bashrc') {
            return {
                type: 'text',
                value: '# ~/.bashrc\nexport PATH=$PATH:~/bin\nalias ll="ls -la"\nalias cls="clear"'
            };
        }
        if (args[0] === '.bash_profile') {
            return {
                type: 'text',
                value: '# ~/.bash_profile\nif [ -f ~/.bashrc ]; then\n    source ~/.bashrc\nfi'
            };
        }
        return {
            type: 'text',
            value: `cat: ${args[0] || 'no file specified'}: No such file or directory`
        };
    },

    neofetch: () => ({
    type: 'html',
    value: `
<div style="display: flex; flex-wrap: wrap; gap: 40px; font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace; background: #1e1e2e; padding: 30px 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: #cdd6f4; max-width: max-content; margin: 0 auto; align-items: center;">
    
    <div style="white-space: pre; font-size: 14px; line-height: 1.2; font-weight: bold;">
        <span style="color: #89b4fa;">⣿⠛⠛⠛⠛⠻⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀</span>
        <span style="color: #89b4fa;">⠛⢛⣿⠋⢀⡾⠃⠀⠀⠀⠀⢀⣤⣤⠤⠤⣤⣤⣀⣀⣀⣠⠶⡶⣤⣀⣠⠾⡷⣦⣀⣤⣤⡤⠤⠦⢤⣤⣄⡀⠀⢠⡶⢶⡄⠀⠀</span>
        <span style="color: #89b4fa;">⢠⡟⠁⣴⣿⢤⡄⣴⢶⠶⡆⠈⢷⡀⠀⠀⠀⠀⢀⣭⣫⠵⠥⠽⣄⣝⠵⢍⣘⣄⠳⣤⣀⠀⠀⢀⡤⠊⣽⠁⠀⠸⣇⠀⢿⠀⠀</span>
        <span style="color: #89b4fa;">⠸⢷⣴⣤⡤⠾⠇⣽⠋⠼⣷⠀⠈⢷⡄⢀⣤⡶⠋⠀⣀⡄⠤⠀⡲⡆⠀⠀⠈⠙⡄⠘⢮⢳⡴⠯⣀⢠⡏⠀⠀⠀⢻⠀⢸⠇⠀</span>
        <span style="color: #89b4fa;">⠀⠀⠀⠀⠀⠀⠀⠙⠛⠋⠉⢀⣴⠟⠉⢯⡞⡠⢲⠉⣼⠀⠀⡰⠁⡇⢀⢷⠀⣄⢵⠀⠈⡟⢄⠀⠀⠙⢷⣤⣤⣤⡿⢢⡿⠀⠀</span>
        <span style="color: #89b4fa;">⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⠟⠑⠊⠁⡼⣌⢠⢿⢸⢸⡀⢰⠁⡸⡇⡸⣸⢰⢈⠘⡄⠀⢸⠀⢣⡀⠀⠈⢮⢢⣏⣤⡾⠃⠀⠀</span>
        <span style="color: #89b4fa;">⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣯⣴⠞⡠⣼⠁⡘⣾⠏⣿⢇⣳⣸⣞⣀⢱⣧⣋⣞⡜⢳⡇⠀⢸⠀⢆⢧⠀⠰⣄⢏⢧⣾⠁⠀⠀⠀</span>
        <span style="color: #89b4fa;">⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢹⡏⢰⠁⡻⠀⡟⡏⠉⠀⣀⠀⠀⠀⠀⣀⠁⠀⠉⠛⢽⠇⠀⣼⡆⠈⡆⠃⠀⡏⠻⣾⣽⣇⡀⠀⠀</span>
        <span style="color: #89b4fa;">⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠁⡇⠀⡇⡄⣿⠷⠿⠿⠛⠀⠀⠀⠀⠛⠻⠿⠿⠿⡜⢀⡴⡟⢸⣸⡼⠀⠀⡇⠀⡞⡆⢻⠙⢦⠀</span>
        <span style="color: #89b4fa;">⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡶⢀⣼⣿⣬⣽⠧⠬⠇⠀⠀⠀⠀⠀⠀⢞⣯⣭⢺⣔⣪⣾⣤⠺⡇⢳⠀⢠⣧⡾⠛⠛⠻⠶⠞⠁</span>
        <span style="color: #89b4fa;">⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠷⢿⠟⠉⡀⠈⢦⡀⠀⠀⣠⠖⠒⠒⢤⡀⠀⢀⡼⠿⢇⡣⢬⣶⠷⢿⣤⡾⠁⠀⠀⠀⠀⠀⠀⠀</span>
        <span style="color: #89b4fa;">⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠷⠾⠷⠖⠛⠛⠲⠶⠿⠤⣤⠤⠤⢷⣶⠋⠀⠀⠀⣱⠞⠁⠀⠈⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀</span>
    </div>

    <div style="flex: 1; min-width: 320px;">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">
            <span style="color: #89b4fa;">oom</span><span style="color: #cdd6f4;">@</span><span style="color: #89b4fa;">linux</span>
        </div>
        <div style="height: 2px; background: linear-gradient(90deg, #89b4fa, #f5c2e7); width: 100%; margin-bottom: 15px; border-radius: 2px;"></div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.6;">
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">OS:</td><td>Linux Mint 22 Vanessa x86_64</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">Host:</td><td>KVM</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">Kernel:</td><td>6.8.0-57-generic</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">Uptime:</td><td>20 days, 14 hrs, 23 mins</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">Packages:</td><td>2898 (dpkg)</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">Shell:</td><td>bash 5.2.21</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">Resolution:</td><td>1920x1080</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">DE:</td><td>GNOME 45</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">Theme:</td><td>Adwaita-dark [GTK3]</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">Icons:</td><td>Adwaita [GTK3]</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">Terminal:</td><td>gnome-terminal</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">CPU:</td><td>AMD EPYC 9334 32-Core @ 3.7 GHz</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">GPU:</td><td>NVIDIA RTX A6000</td></tr>
            <tr><td style="color: #f9e2af; font-weight: bold; padding-right: 20px;">Memory:</td><td>4946MiB / 262144MiB</td></tr>
        </table>

        <div style="display: flex; gap: 8px; margin-top: 20px;">
            <div style="width: 18px; height: 18px; border-radius: 50%; background: #45475a;"></div>
            <div style="width: 18px; height: 18px; border-radius: 50%; background: #f38ba8;"></div>
            <div style="width: 18px; height: 18px; border-radius: 50%; background: #a6e3a1;"></div>
            <div style="width: 18px; height: 18px; border-radius: 50%; background: #f9e2af;"></div>
            <div style="width: 18px; height: 18px; border-radius: 50%; background: #89b4fa;"></div>
            <div style="width: 18px; height: 18px; border-radius: 50%; background: #f5c2e7;"></div>
            <div style="width: 18px; height: 18px; border-radius: 50%; background: #94e2d5;"></div>
            <div style="width: 18px; height: 18px; border-radius: 50%; background: #bac2de;"></div>
        </div>
    </div>

</div>

`
}),

    uname: () => ({ type: 'text', value: 'Linux linux 6.8.0-57-generic x86_64 GNU/Linux' }),
    uptime: () => ({ type: 'text', value: '20:14:23 up 20 days, 14:23, 1 user, load average: 0.42, 0.35, 0.28' }),

    cowsay: (args) => {
        const msg = args.join(' ') || 'Moo!';
        const line = '-'.repeat(msg.length + 2);
        return {
            type: 'text',
            value: ` ${line}
< ${msg} >
 ${line}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`
        };
    },

    history: () => ({
        type: 'text',
        value: terminalState.history.length
            ? terminalState.history.map((cmd, i) => `${i + 1}  ${cmd}`).join('\n')
            : 'No commands in history yet.'
    }),

    fortune: () => {
        const fortunes = [
            'Stay hungry, stay foolish.',
            'The quieter you become, the more you are able to hear.',
            'There is no place like 127.0.0.1',
            'In a world without fences and walls, who needs Gates and Windows?',
            'First, solve the problem. Then, write the code.',
            'Beware of bugs in the above code; I have only proved it correct, not tried it.',
            'Talk is cheap. Show me the code.'
        ];
        return {
            type: 'text',
            value: fortunes[randomInt(0, fortunes.length - 1)]
        };
    },

    exit: () => {
    stopHtop();
    stopAllPing();
    return { type: 'exit', value: 'logout' };
},

    sudo: (args) => {
        if (!args.length) {
            return { type: 'text', value: 'usage: sudo <command>' };
        }

        const nestedCommand = args[0];
        const nestedArgs = args.slice(1);

        if (nestedCommand === 'apt') {
            return terminalCommands.apt(nestedArgs, true);
        }

        return {
            type: 'text',
            value: `[sudo] password for oom: ********\n${nestedCommand}: command executed as root`
        };
    },

    apt: (args, isSudo = false) => {
        const subcmd = args[0];

        if (!subcmd) {
            return { type: 'text', value: 'Usage: apt [update|upgrade]' };
        }

        if (subcmd === 'update') {
            return {
                type: 'lines',
                lines: [
                    ...(isSudo ? ['[sudo] password for oom: ********'] : []),
                    'Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease',
                    'Hit:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease',
                    'Hit:3 http://archive.ubuntu.com/ubuntu jammy-backports InRelease',
                    'Hit:4 http://security.ubuntu.com/ubuntu jammy-security InRelease',
                    'Reading package lists... Done',
                    'Building dependency tree... Done',
                    'Reading state information... Done',
                    'All packages are up to date.'
                ]
            };
        }

        if (subcmd === 'upgrade') {
            return {
                type: 'lines',
                lines: [
                    ...(isSudo ? ['[sudo] password for oom: ********'] : []),
                    'Reading package lists... Done',
                    'Building dependency tree... Done',
                    'Reading state information... Done',
                    'Calculating upgrade... Done',
                    'The following packages will be upgraded:',
                    '  gnome-shell mutter nautilus pipewire firefox',
                    '5 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.',
                    'Need to get 82.4 MB of archives.',
                    'After this operation, 14.8 MB of additional disk space will be used.',
                    'Do you want to continue? [Y/n] y',
                    'Get:1 http://archive.ubuntu.com/ubuntu jammy-updates/main amd64 gnome-shell 45.2 [8,420 kB]',
                    'Get:2 http://archive.ubuntu.com/ubuntu jammy-updates/main amd64 mutter 45.2 [10.1 MB]',
                    'Get:3 http://archive.ubuntu.com/ubuntu jammy-updates/main amd64 nautilus 45.1 [6,280 kB]',
                    'Get:4 http://archive.ubuntu.com/ubuntu jammy-updates/main amd64 pipewire 1.0.5 [4,118 kB]',
                    'Get:5 http://archive.ubuntu.com/ubuntu jammy-updates/main amd64 firefox 124.0 [53.5 MB]',
                    'Fetched 82.4 MB in 4s (20.6 MB/s)',
                    '(Reading database ... 312345 files and directories currently installed.)',
                    'Preparing to unpack ...',
                    'Unpacking gnome-shell...',
                    'Unpacking mutter...',
                    'Unpacking nautilus...',
                    'Unpacking pipewire...',
                    'Unpacking firefox...',
                    'Setting up gnome-shell...',
                    'Setting up mutter...',
                    'Setting up nautilus...',
                    'Setting up pipewire...',
                    'Setting up firefox...',
                    'Processing triggers for man-db...',
                    'Processing triggers for desktop-file-utils...',
                    'Processing triggers for initramfs-tools...',
                    'Upgrade complete! 🎉'
                ]
            };
        }

        return { type: 'text', value: `apt: unknown subcommand: ${subcmd}` };
    },

    ping: (args) => {
        const host = args[0] || 'google.com';
        return {
            type: 'ping',
            host
        };
    },

    htop: () => ({
        type: 'htop'
    }),

    rm: (args) => {
        if (args.join(' ') === '-rf /' || args.join(' ') === '-rf /*') {
            return {
                type: 'text',
                value: `rm: it is dangerous to operate recursively on '/'\nNice try 😏`
            };
        }

        return {
            type: 'text',
            value: `rm: cannot remove '${args.join(' ') || ''}': Permission denied`
        };
    }
};



        function appendTerminalEntry(output, cmd, result) {
    const cmdLine = document.createElement('div');
    cmdLine.style.lineHeight = '1.6';

    const prompt = document.createElement('span');
    prompt.style.cssText = 'color: #89b4fa; font-size: 14px;';
    prompt.textContent = '[oom@linux ~]$ ';

    const cmdText = document.createElement('span');
    cmdText.style.cssText = 'color: #f5c2e7; font-size: 14px;';
    cmdText.textContent = cmd;

    cmdLine.append(prompt, cmdText);
    output.appendChild(cmdLine);

    if (result.type === 'html') {
        const htmlWrap = document.createElement('div');
        htmlWrap.style.cssText = 'line-height: 1.6; font-size: 14px;';
        htmlWrap.innerHTML = result.value;
        output.appendChild(htmlWrap);
    } else if (result.type === 'text') {
        const textWrap = document.createElement('div');
        textWrap.style.cssText = 'line-height: 1.6; font-size: 14px; white-space: pre-wrap;';
        textWrap.textContent = result.value;
        output.appendChild(textWrap);
    }

    output.appendChild(document.createElement('br'));
    output.scrollTop = output.scrollHeight;
}

       function initTerminal() {
    const output = document.getElementById('terminal-output');
    const input = document.getElementById('terminal-input');
    if (!output || !input) return;

    if (!output.dataset.booted) {
        output.innerHTML = `<span style="color: #a6e3a1;">Welcome to GNOME Terminal!</span><br>Type 'help' for available commands.<br><br>`;
        output.dataset.booted = 'true';
    }

    if (!input.dataset.bound) {
        input.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                const cmd = input.value.trim();
                if (!cmd) return;

                // A new command replaces any live background jobs.
                stopHtop();
                stopAllPing();

                terminalState.history.push(cmd);
                terminalState.historyIndex = terminalState.history.length;

                const parts = cmd.split(/\s+/);
                const command = parts[0].toLowerCase();
                const args = parts.slice(1);

                let result;
                if (terminalCommands[command]) {
                    result = terminalCommands[command](args);
                } else {
                    result = {
                        type: 'text',
                        value: `Command not found: ${command}\nType 'help' for available commands.`
                    };
                }

                input.value = '';

                if (result.type === 'clear') {
    output.innerHTML = '';
    output.dataset.booted = 'true';
} else if (result.type === 'exit') {
    appendTerminalEntry(output, cmd, {
        type: 'text',
        value: 'logout'
    });

    const terminalWindow = windowManager.get('terminal');
    if (terminalWindow) {
        setTimeout(() => {
            terminalWindow.close();
        }, 250);
    }
} else if (result.type === 'lines') {
    await appendTerminalLines(output, cmd, result.lines);
} else if (result.type === 'ping') {

                    appendTerminalEntry(output, cmd, {
                        type: 'text',
                        value: `PING ${result.host} (${result.host}) 56(84) bytes of data.`
                    });

                    let seq = 1;
                    const intervalId = setInterval(() => {
                        const time = (Math.random() * 40 + 12).toFixed(1);
                        appendLiveLine(
                            output,
                            `64 bytes from ${result.host}: icmp_seq=${seq++} ttl=117 time=${time} ms`
                        );
                    }, randomInt(700, 1200));

                    // Key by host so re-pinging the same host replaces the old interval.
                    terminalState.pingIntervals.set(result.host, intervalId);
                } else if (result.type === 'htop') {
                    

                    const frame = appendLiveLine(output, generateHtopFrame(), '#a6e3a1');
                    frame.style.fontFamily = 'var(--font-mono)';
                    frame.style.whiteSpace = 'pre-wrap';

                    terminalState.htopInterval = setInterval(() => {
                        frame.textContent = generateHtopFrame();
                        output.scrollTop = output.scrollHeight;
                    }, 900);
                } else {
                    appendTerminalEntry(output, cmd, result);
                }

                output.scrollTop = output.scrollHeight;
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (terminalState.historyIndex > 0) {
                    terminalState.historyIndex--;
                    input.value = terminalState.history[terminalState.historyIndex];
                }
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (terminalState.historyIndex < terminalState.history.length - 1) {
                    terminalState.historyIndex++;
                    input.value = terminalState.history[terminalState.historyIndex];
                } else {
                    terminalState.historyIndex = terminalState.history.length;
                    input.value = '';
                }
            }
        });

        input.dataset.bound = 'true';
    }

    input.focus();
}

        function openOrToggleWindow(windowId) {
    let win = windowManager.get(windowId);

    // Count the windows that are currently open
    const openWindows = Array.from(windowManager.values()).filter(w => !w.hidden);

    if (!win) {
        if (openWindows.length >= 3) {
            showNotification('⚠️ You can only have 3 windows open at a time!');
            return;
        }

        win = new GnomeWindow(windowId);
        windowManager.set(windowId, win);
        win.show();
        updateAppMenu();
        return;
    }

    if (win.hidden) {
        if (openWindows.length >= 3) {
            showNotification('⚠️ You can only have 3 windows open at a time!');
            return;
        }
        win.show();
    } else if (activeWindowId === windowId) {
        win.minimize();
    } else {
        win.show();
    }

    updateAppMenu();
}

        function initAppSwitcher() {
            const appSwitcher = document.getElementById('appSwitcher');
            const appMenu = document.getElementById('appMenu');

            appSwitcher.addEventListener('click', event => {
                event.stopPropagation();
                appMenu.classList.toggle('show');
                updateAppMenu();
            });

            document.addEventListener('click', event => {
                if (!appMenu.contains(event.target) && !event.target.closest('#appSwitcher')) {
                    appMenu.classList.remove('show');
                }
            });
        }

        function initDash() {
            const dash = document.getElementById('dash');

            dash.addEventListener('click', event => {
                const button = event.target.closest('.dash-icon');
                if (!button) return;
                createRipple(event, button);
                openOrToggleWindow(button.dataset.window);
            });
        }

        function initWindowDragging() {
            let dragState = null;

            document.addEventListener('pointerdown', event => {
                const titleBar = event.target.closest('.title-bar');
                if (!titleBar || event.target.closest('.control-btn')) return;

                const winEl = titleBar.closest('.window');
                if (!winEl) return;

                const windowId = winEl.dataset.windowId;
                const win = windowManager.get(windowId);
                if (!win || win.maximized) return;

                const rect = winEl.getBoundingClientRect();
                dragState = {
                    win,
                    offsetX: event.clientX - rect.left,
                    offsetY: event.clientY - rect.top
                };

                win.bringToFront();
                titleBar.setPointerCapture?.(event.pointerId);
            });

            document.addEventListener('pointermove', event => {
                if (!dragState) return;

                const el = dragState.win.element;
                let nextLeft = event.clientX - dragState.offsetX;
                let nextTop = event.clientY - dragState.offsetY;

                const rect = el.getBoundingClientRect();
                const maxLeft = window.innerWidth - rect.width;
                const minTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) + 4;
                const maxTop = window.innerHeight - 90 - rect.height;

                nextLeft = Math.max(0, Math.min(nextLeft, Math.max(0, maxLeft)));
                nextTop = Math.max(minTop, Math.min(nextTop, Math.max(minTop, maxTop)));

                el.style.left = nextLeft + 'px';
                el.style.top = nextTop + 'px';
            });

            document.addEventListener('pointerup', () => {
                dragState = null;
            });

            window.addEventListener('resize', () => {
                windowManager.forEach(win => clampWindowPosition(win.element));
            });
        }

        function init() {
            createParticles();
            buildWindowsData();
            initDash();
            initAppSwitcher();
            initWindowDragging();
            scheduleClock();

            // The terminal is the only app — open it right away.
            openOrToggleWindow('terminal');

            document.getElementById('activities').addEventListener('click', (event) => {
                // Don't let the document-level "outside click" handler
                // immediately undo this intentional toggle.
                event.stopPropagation();
                const anyVisible = Array.from(windowManager.values()).some(win => !win.hidden);
                if (!anyVisible) {
                    openOrToggleWindow('terminal');
                } else {
                    updateAppMenu();
                    document.getElementById('appMenu').classList.toggle('show');
                }
            });
        }

        init();
