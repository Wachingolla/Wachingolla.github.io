
// // UI References
const idleScreen = document.getElementById('idle-screen');
const loaderScreen = document.getElementById('loader-screen');
const statusMsg = document.getElementById('status-msg');
const debugLog = document.getElementById('debug-log');
const sendersInfo = document.getElementById('senders-info');
const senderCount = document.getElementById('sender-count');
const toastEl = document.getElementById('toast');

// --- 0. INITIALIZATION ---
const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const playbackConfig = new cast.framework.PlaybackConfig();


// Example of modifying the manifest request to include credentials (e.g. cookies) for CORS requests
playbackConfig.manifestRequestHandler = requestInfo => {
  requestInfo.withCredentials = true;
};

playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD, loadRequestData => {
        const error = new cast.framework.messages.ErrorData(
                        cast.framework.messages.ErrorType.LOAD_FAILED);
        if (!loadRequestData.media) {
        error.reason = cast.framework.messages.ErrorReason.INVALID_PARAM;
        return error;
        }

        if (!loadRequestData.media.entity) {
        return loadRequestData;
        }

        return thirdparty.fetchAssetAndAuth(loadRequestData.media.entity,
                                            loadRequestData.credentials)
        .then(asset => {
            if (!asset) {
            throw cast.framework.messages.ErrorReason.INVALID_REQUEST;
            }

            idleScreen.classList.remove('active');
            loadRequestData.media.contentUrl = asset.url;
            loadRequestData.media.metadata = asset.metadata;
            loadRequestData.media.tracks = asset.tracks;
            return loadRequestData;
        }).catch(reason => {
            error.reason = reason; // cast.framework.messages.ErrorReason
            return error;
        });
    });

playerManager.addEventListener(
        cast.framework.events.EventType.MEDIA_STATUS, (event) => {
        // Write your own event handling code, for example
        // using the event.mediaStatus value
    });

// // --- 1. SENDER CONNECTION LISTENERS ---
// // (Moved outside of the READY event to catch the very first connection)
context.addEventListener(
    cast.framework.system.EventType.SENDER_CONNECTED,
    function(event) {
        log('Sender connected: ' + event.senderId);
        updateSenderUI();
        showToast('Device connected — ready to cast');
        broadcastStatus('SENDER_CONNECTED', { newSenderId: event.senderId });
    }
);

playerManager.setSupportedMediaCommands(cast.framework.messages.Command.SEEK |
cast.framework.messages.Command.PAUSE);

context.start({
    playbackConfig: playbackConfig,
    playerManager: playerManager
});


    // const CUSTOM_NAMESPACE = 'urn:x-cast:com.fossynet.presumiendomx';
    // cast.framework.CastReceiverContext.getInstance().start(); 
    
    // const context = cast.framework.CastReceiverContext.getInstance();
    // const playerManager = context.getPlayerManager();

    // let toastTimeout = null;

    // // --- HELPER FUNCTIONS ---
    function log(msg) {
        console.log('[RECEIVER] ' + msg);
        debugLog.innerText = msg;
    }

    function showToast(message, duration) {
        duration = duration || 4000;
        toastEl.innerText = message;
        toastEl.classList.add('show');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(function() {
            toastEl.classList.remove('show');
        }, duration);
    }

    function updateSenderUI() {
        var senders = context.getSenders();
        var count = senders.length;
        if (count > 0) {
            senderCount.innerHTML = count === 1 ? '1 device connected' : count + ' devices connected';
            sendersInfo.classList.add('visible');
            statusMsg.innerText = 'Connected';
        } else {
            sendersInfo.classList.remove('visible');
            senderCount.innerHTML = '';
            statusMsg.innerText = 'Ready to Cast';
        }
    }

    function broadcastStatus(eventType, extra) {
        var senders = context.getSenders();
        var status = {
            type: 'STATUS_UPDATE',
            event: eventType,
            senderCount: senders.length,
            senders: senders.map(function(s) { return s.id; }),
            timestamp: Date.now()
        };
        if (extra) Object.assign(status, extra);

        try {
            context.sendCustomMessage(CUSTOM_NAMESPACE, undefined, status);
        } catch (e) {
            console.warn('[RECEIVER] Broadcast failed:', e);
        }
    }

    context.addEventListener(
        cast.framework.system.EventType.SENDER_DISCONNECTED,
        function(event) {
            log('Sender disconnected: ' + event.senderId);
            updateSenderUI();

            if (context.getSenders().length === 0) {
                showToast('All devices disconnected');
            } else {
                showToast('A device disconnected');
                broadcastStatus('SENDER_DISCONNECTED', { removedSenderId: event.senderId });
            }
        }
    );

    // --- 2. PLAYER STATE LISTENERS ---
    playerManager.addEventListener(
        cast.framework.events.EventType.PLAYER_STATE_CHANGED,
        function(event) {
            var state = event.value;
            log('State: ' + state);

            switch(state) {
                case cast.framework.events.PlayerState.IDLE:
                    idleScreen.classList.add('active');
                    loaderScreen.classList.remove('active');
                    updateSenderUI(); // Re-evaluates if we are "Connected" or "Ready"
                    break;
                case cast.framework.events.PlayerState.BUFFERING:
                case cast.framework.events.PlayerState.LOADING:
                    idleScreen.classList.remove('active');
                    loaderScreen.classList.add('active');
                    break;
                case cast.framework.events.PlayerState.PLAYING:
                    idleScreen.classList.remove('active');
                    loaderScreen.classList.remove('active');
                    break;
                case cast.framework.events.PlayerState.PAUSED:
                    loaderScreen.classList.remove('active');
                    break;
            }
            broadcastStatus('PLAYER_STATE_CHANGED', { playerState: state });
        }
    );

    playerManager.setMessageInterceptor(
        cast.framework.messages.MessageType.LOAD,
        function(loadRequestData) {
            if (loadRequestData.media && loadRequestData.media.metadata) {
                var title = loadRequestData.media.metadata.title;
                statusMsg.innerText = 'Loading: ' + title;
                showToast('Loading: ' + title);
            }
            return loadRequestData;
        }
    );

    // --- 3. CUSTOM MESSAGE LISTENER ---
    context.addCustomMessageListener(CUSTOM_NAMESPACE, function(customEvent) {
        var data = customEvent.data;
        switch (data.type) {
            case 'SHOW_TOAST':
                showToast(data.message || 'Notification', data.duration || 4000);
                break;
            case 'SET_STATUS_MSG':
                statusMsg.innerText = data.message || '';
                break;
        }
    }); 

    // Register namespace before starting
    options.customNamespaces = {};
    options.customNamespaces[CUSTOM_NAMESPACE] = cast.framework.system.MessageType.JSON;
    log('Receiver started successfully');