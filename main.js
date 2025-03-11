const { app, BrowserWindow, Menu, nativeImage, ipcMain, globalShortcut, session } = require('electron');
const path = require('path');
const { ElectronBlocker, fetchLists } = require('@cliqz/adblocker-electron');

app.whenReady().then(async () => {
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetchLists, {
        enableCompression: true,
        debug: true
    });
    blocker.enableBlockingInSession(session.defaultSession);
    console.log('Bloqueador de anúncios ativado!');
});

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048');
app.commandLine.appendSwitch('enable-faster-path-rendering');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

const adBlockFilters = [
    '*://*.doubleclick.net/*',
    '*://partner.googleadservices.com/*',
    '*://*.googlesyndication.com/*',
    '*://*.google-analytics.com/*',
    '*://creative.ak.fbcdn.net/*',
    '*://*.adbrite.com/*',
    '*://*.exponential.com/*',
    '*://*.quantserve.com/*',
    '*://*.scorecardresearch.com/*',
    '*://*.zedo.com/*',
    '*://*.doubleclick.net/*',
    '*://*.advertising.com/*',
    '*://*.adnxs.com/*',
    '*://ads.youtube.com/*',
    '*://ads.twitter.com/*',
    '*://ads.linkedin.com/*',
    '*://ads.facebook.com/*',
    '*://*.taboola.com/*',
    '*://*.outbrain.com/*',
    '*://*.adroll.com/*'
];

function createWindow() {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    const appIcon = nativeImage.createFromPath(iconPath);

    const mainWindow = new BrowserWindow({
        width: 1500,
        height: 968,
        icon: appIcon,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            enableRemoteModule: false,
            sandbox: true,
            spellcheck: true,
            backgroundThrottling: false,
            autoplayPolicy: 'no-user-gesture-required',
            devTools: false,
            webgl: true,
            experimentalFeatures: false
        },
        frame: true,
        titleBarStyle: 'default',
        backgroundColor: '#000000',
        minWidth: 800,
        minHeight: 600,
        show: false,
        paintWhenInitiallyHidden: true,
        offscreen: false
    });

    let loadingOverlay = null;

    function createLoadingOverlay() {
        loadingOverlay = new BrowserWindow({
            width: 200,
            height: 200,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        loadingOverlay.loadURL(`data:text/html;charset=utf-8,
            <html>
            <head>
                <style>
                    body {
                        margin: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        background: transparent;
                        font-family: 'Segoe UI', sans-serif;
                        color: white;
                        text-align: center;
                    }
                    .loader {
                        background: rgba(0, 0, 0, 0.8);
                        padding: 20px;
                        border-radius: 10px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 10px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="loader">
                    <div class="spinner"></div>
                    <div>Carregando...</div>
                </div>
            </body>
            </html>
        `);

        const [mainX, mainY] = mainWindow.getPosition();
        const [mainWidth, mainHeight] = mainWindow.getSize();
        const [overlayWidth, overlayHeight] = loadingOverlay.getSize();
        
        loadingOverlay.setPosition(
            mainX + (mainWidth - overlayWidth) / 2,
            mainY + (mainHeight - overlayHeight) / 2
        );

        loadingOverlay.hide();
    }

    function showLoading(show = true) {
        if (!loadingOverlay) createLoadingOverlay();
        if (show) {
            loadingOverlay.show();
        } else {
            loadingOverlay.hide();
        }
    }

    mainWindow.webContents.on('did-start-loading', () => {
        showLoading(true);
    });

    mainWindow.webContents.on('did-stop-loading', () => {
        showLoading(false);
    });

    mainWindow.webContents.on('did-fail-load', () => {
        showLoading(false);
    });

    mainWindow.on('move', () => {
        if (loadingOverlay && !loadingOverlay.isDestroyed()) {
            const [mainX, mainY] = mainWindow.getPosition();
            const [mainWidth, mainHeight] = mainWindow.getSize();
            const [overlayWidth, overlayHeight] = loadingOverlay.getSize();
            
            loadingOverlay.setPosition(
                mainX + (mainWidth - overlayWidth) / 2,
                mainY + (mainHeight - overlayHeight) / 2
            );
        }
    });

    mainWindow.on('closed', () => {
        if (loadingOverlay && !loadingOverlay.isDestroyed()) {
            loadingOverlay.close();
        }
    });

    let navigationHistory = [];
    let currentHistoryIndex = -1;

    function addToHistory(url) {
        currentHistoryIndex++;
        navigationHistory = navigationHistory.slice(0, currentHistoryIndex);
        navigationHistory.push(url);
    }

    async function navigateTo(url, addToHistoryStack = true) {
        try {
            await mainWindow.webContents.executeJavaScript(`
                const loadingIndicator = document.createElement('div');
                loadingIndicator.id = 'loadingIndicator';
                loadingIndicator.style.position = 'fixed';
                loadingIndicator.style.top = '50%';
                loadingIndicator.style.left = '50%';
                loadingIndicator.style.transform = 'translate(-50%, -50%)';
                loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                loadingIndicator.style.color = '#fff';
                loadingIndicator.style.padding = '40px 60px';
                loadingIndicator.style.borderRadius = '15px';
                loadingIndicator.style.zIndex = '999999';
                loadingIndicator.style.fontSize = '1.5rem';
                loadingIndicator.style.textAlign = 'center';
                loadingIndicator.innerHTML = 'Carregando...<br><div class="spinner" style="border: 4px solid rgba(255, 255, 255, 0.3); border-top: 4px solid #fff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 10px auto;"></div>';
                
                const existingIndicator = document.getElementById('loadingIndicator');
                if (existingIndicator) {
                    existingIndicator.remove();
                }
                
                document.body.appendChild(loadingIndicator);
            `);
            
            if (addToHistoryStack) {
                addToHistory(url);
            }
            
            await mainWindow.loadURL(url);
        } catch (error) {
            console.error('Erro na navegação:', error);
        }
    }

    app.whenReady().then(() => {
        globalShortcut.register('Escape', () => {
            if (navigationHistory.length > 0 && currentHistoryIndex > 0) {
                currentHistoryIndex--;
                navigateTo(navigationHistory[currentHistoryIndex], false);
            }
        });

        globalShortcut.register('Alt+Left', () => {
            if (navigationHistory.length > 0 && currentHistoryIndex > 0) {
                currentHistoryIndex--;
                navigateTo(navigationHistory[currentHistoryIndex], false);
            }
        });

        globalShortcut.register('Alt+Right', () => {
            if (currentHistoryIndex < navigationHistory.length - 1) {
                currentHistoryIndex++;
                navigateTo(navigationHistory[currentHistoryIndex], false);
            }
        });
    });

    const menuTemplate = [
        {
            label: 'Arquivo',
            submenu: [
                {
                    label: 'Inicio',
                    accelerator: 'Alt+i',
                    click: () => {
                        mainWindow.loadURL('https://antagonistatv.site/');
                    }
                },
                {
                    label: 'Apoie o Projeto',
                    accelerator: 'Alt+A',
                    click: () => {
                        mainWindow.loadURL('https://antagonistaoficial.site/');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Voltar',
                    accelerator: 'Alt+Left',
                    click: () => {
                        if (navigationHistory.length > 0 && currentHistoryIndex > 0) {
                            currentHistoryIndex--;
                            navigateTo(navigationHistory[currentHistoryIndex], false);
                        }
                    }
                },
                {
                    label: 'Avançar',
                    accelerator: 'Alt+Right',
                    click: () => {
                        if (currentHistoryIndex < navigationHistory.length - 1) {
                            currentHistoryIndex++;
                            navigateTo(navigationHistory[currentHistoryIndex], false);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Sair',
                    accelerator: 'Alt+F4',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'Visualizar',
            submenu: [
                {
                    label: 'Recarregar',
                    accelerator: 'F5',
                    click: () => mainWindow.reload()
                },
                {
                    label: 'Tela Cheia',
                    accelerator: 'F11',
                    click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen())
                },
                { type: 'separator' },
                {
                    label: 'Zoom +',
                    accelerator: 'Alt+Plus',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomFactor();
                        mainWindow.webContents.setZoomFactor(Math.min(currentZoom + 0.1, 2.0));
                    }
                },
                {
                    label: 'Zoom -',
                    accelerator: 'Alt+Minus',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomFactor();
                        mainWindow.webContents.setZoomFactor(Math.max(currentZoom - 0.1, 0.5));
                    }
                },
                {
                    label: 'Restaurar Zoom',
                    accelerator: 'Alt+0',
                    click: () => mainWindow.webContents.setZoomFactor(1.0)
                }
            ]
        },
        {
            label: 'Comunidade',
            submenu: [
                {
                    label: 'Discord',
                    accelerator: 'Alt+D',
                    click: () => {
                        require('electron').shell.openExternal('https://discord.gg/MWHHg7UzwY');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    mainWindow.webContents.session.webRequest.onBeforeRequest({ urls: adBlockFilters }, (details, callback) => {
        callback({ cancel: true });
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Permitir apenas URLs específicas (ajuste conforme necessário)
        if (permittedUrls.some(allowed => url.startsWith(allowed))) {
            mainWindow.loadURL(url);
        }
        return { action: 'deny' };
    });
    const permittedUrls = [
        'https://antagonistatv.site',
        'https://antagonistaoficial.site/'
    ];
async function setupAdBlocker(session) {
    try {
        const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetchLists, {
            enableCompression: true,
            debug: true
        });
        blocker.addPatterns([
            '*://*.popxperts.com/*',
            '*://*.adsystem.com/*',
            '*://*.adserver.com/*'
        ]);
        blocker.enableBlockingInSession(session);
        console.log('Bloqueador de anúncios configurado!');
    } catch (error) {
        console.error('Erro ao configurar bloqueador:', error);
    }
}

// duplicacao de algumas func pra teste .
function createWindow() {
    const mainWindow = new BrowserWindow({ /* ... */ });
    setupAdBlocker(mainWindow.webContents.session);
}

    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const url = webContents.getURL();
        callback(permittedUrls.some(permittedUrl => url.startsWith(permittedUrl)));
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (permittedUrls.some(permittedUrl => url.startsWith(permittedUrl))) {
            mainWindow.loadURL(url);
        }
        return { action: 'deny' };
    });
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
            // Adiciona estilos para animação do spinner e barra de rolagem
            const style = document.createElement('style');
            style.innerHTML = \`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                ::-webkit-scrollbar {
                    width: 8px;
                    background-color: #000000;
                }
                
                ::-webkit-scrollbar-thumb {
                    background-color: #333333;
                    border-radius: 4px;
                }
                
                ::-webkit-scrollbar-track {
                    background-color: #000000;
                }

                * {
                    scrollbar-width: thin;
                    scrollbar-color: #333333 #000000;
                }

                body {
                    background-color: #000000;
                }
            \`;
            document.head.appendChild(style);

            // Cria um container para os botões
            const buttonContainer = document.createElement('div');
            buttonContainer.style.position = 'fixed';
            buttonContainer.style.bottom = '10px';
            buttonContainer.style.left = '50%';
            buttonContainer.style.transform = 'translateX(-50%)';
            buttonContainer.style.zIndex = '1000';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '10px';
            document.body.appendChild(buttonContainer);

            // Cria o botão de voltar
            const backButton = document.createElement('button');
            backButton.innerText = '← Voltar';
            backButton.style.backgroundColor = '#333';
            backButton.style.color = '#fff';
            backButton.style.border = 'none';
            backButton.style.padding = '10px 20px';
            backButton.style.borderRadius = '5px';
            backButton.style.cursor = 'pointer';
            backButton.style.transition = 'background-color 0.3s ease';
            backButton.addEventListener('mouseenter', () => {
                backButton.style.backgroundColor = '#444';
            });
            backButton.addEventListener('mouseleave', () => {
                backButton.style.backgroundColor = '#333';
            });
            backButton.addEventListener('click', () => {
                window.history.back();
            });
            buttonContainer.appendChild(backButton);

            // Cria o botão de avançar
            const forwardButton = document.createElement('button');
            forwardButton.innerText = 'Avançar →';
            forwardButton.style.backgroundColor = '#333';
            forwardButton.style.color = '#fff';
            forwardButton.style.border = 'none';
            forwardButton.style.padding = '10px 20px';
            forwardButton.style.borderRadius = '5px';
            forwardButton.style.cursor = 'pointer';
            forwardButton.style.transition = 'background-color 0.3s ease';
            forwardButton.addEventListener('mouseenter', () => {
                forwardButton.style.backgroundColor = '#444';
            });
            forwardButton.addEventListener('mouseleave', () => {
                forwardButton.style.backgroundColor = '#333';
            });
            forwardButton.addEventListener('click', () => {
                window.history.forward();
            });
            buttonContainer.appendChild(forwardButton);

            // Cria o indicador de carregamento (mas mantém escondido inicialmente)
            if (!document.getElementById('loadingIndicator')) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'loadingIndicator';
            loadingIndicator.style.position = 'fixed';
            loadingIndicator.style.top = '50%';
            loadingIndicator.style.left = '50%';
            loadingIndicator.style.transform = 'translate(-50%, -50%)';
            loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            loadingIndicator.style.color = '#fff';
                loadingIndicator.style.padding = '40px 60px';
            loadingIndicator.style.borderRadius = '15px';
                loadingIndicator.style.zIndex = '999999';
            loadingIndicator.style.display = 'none';
                loadingIndicator.style.fontSize = '1.5rem';
            loadingIndicator.style.textAlign = 'center';
            loadingIndicator.innerHTML = 'Carregando...<br><div class="spinner" style="border: 4px solid rgba(255, 255, 255, 0.3); border-top: 4px solid #fff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 10px auto;"></div>';
            document.body.appendChild(loadingIndicator);
            }
        `);
    });

    // Adiciona recursos extras
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
            // Estilos avançados e animações
            const enhancedStyles = document.createElement('style');
            enhancedStyles.innerHTML = \`
                /* Reset e configurações base */
                * {
                    margin: 0;
                    padding: 0;
                    transition: all 0.3s ease-out;
                }

                /* Ajustes do menu */
                .menubar, .toolbar {
                    margin: 0 !important;
                    padding: 0 !important;
                    min-height: 0 !important;
                }

                /* Remove espaços indesejados */
                #root, #app, main, header, nav, .content, .container, .wrapper {
                    margin: 0 !important;
                    padding: 0 !important;
                }

                /* Botões de navegação flutuantes */
                #buttonContainer {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 1000;
                    display: flex;
                    gap: 15px;
                    padding: 10px;
                    border-radius: 12px;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(10px);
                    border: 1px solid #B8860B;
                }

                /* Estilo dos botões de navegação */
                #buttonContainer button {
                    background: linear-gradient(135deg, #1a1a1a, #333);
                    color: #DAA520;
                    border: 1px solid #B8860B;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    box-shadow: 0 4px 8px rgba(184, 134, 11, 0.2);
                    transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
                }

                #buttonContainer button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 12px rgba(184, 134, 11, 0.3);
                    background: linear-gradient(135deg, #2a2a2a, #444);
                    border-color: #DAA520;
                    color: #FFD700;
                }

                /* Loading */
                #loadingIndicator {
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(10px);
                    border: 1px solid #B8860B;
                    box-shadow: 0 8px 32px rgba(184, 134, 11, 0.2);
                }
            \`;
            document.head.appendChild(enhancedStyles);

            // Remove espaços indesejados
            function removeSpaces() {
                document.body.style.marginTop = '0';
                document.body.style.paddingTop = '0';
                
                const elements = document.querySelectorAll('body > *');
                elements.forEach(el => {
                    if (el.style) {
                        el.style.marginTop = '0';
                        el.style.paddingTop = '0';
                    }
                });
            }

            // Executa imediatamente
            removeSpaces();

            // Observa mudanças no DOM
            const observer = new MutationObserver(removeSpaces);
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Força a remoção de espaços após o carregamento
            window.addEventListener('load', removeSpaces);
            window.addEventListener('DOMContentLoaded', removeSpaces);
        `);
    });

    // Carrega a página inicial
    mainWindow.loadFile(path.join(__dirname, 'splash.html'));
    addToHistory('splash.html');

    // Quando o vídeo terminar, carrega o site principal
    mainWindow.webContents.on('did-finish-load', () => {
        if (navigationHistory[currentHistoryIndex] === 'splash.html') {
        mainWindow.webContents.executeJavaScript(`
                const video = document.getElementById('openingVideo');
                if (video) {
                    video.addEventListener('ended', () => {
                        window.location.href = 'https://antagonistatv.site/';
                    });
                }
            `);
        }
    });

    // Gerenciamento de memória otimizado
    const gcInterval = setInterval(() => {
        if (global.gc) {
            global.gc();
        }
        app.getGPUFeatureStatus(); // Atualiza status da GPU
    }, 300000);

    // Mostra a janela quando estiver pronta
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

// Inicia o aplicativo
app.whenReady().then(createWindow);

// Gerenciamento do ciclo de vida do aplicativo
app.on('window-all-closed', () => {
    globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});