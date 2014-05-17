"use strict";

window.castReceiverManager = null;
window.mediaManager = null;
window.messageBus = null;
window.mediaElement = null;
window.mediaHost = null;
window.mediaProtocol = null;
window.mediaPlayer = null;
window.connectedCastSenders = []; // {senderId:'', channel:obj}              

window.onload = function() {
  window.mediaElement = document.getElementById('receiverVideoElement');

  /**
       play – The process of play has started
       waiting – When the video stops due to buffering
       volumechange – volume has changed
       stalled – trying to get data, but not available
       ratechange – some speed changed
       canplay – It is possible to start playback, but no guarantee of not buffering
       canplaythrough – It seems likely that we can play w/o buffering issues
       ended – the video has finished
       error – error occured during loading of the video
       playing – when the video has started playing
       seeking – started seeking
       seeked – seeking has completed

       http://www.w3.org/2010/05/video/mediaevents.html for more info.
       **/

  /**
   * Sets the log verbosity level.
   *
   * Debug logging (all messages).
   * DEBUG
   *
   * Verbose logging (sender messages).
   * VERBOSE
   *
   * Info logging (events, general logs).
   * INFO
   *
   * Error logging (errors).
   * ERROR
   *
   * No logging.
   * NONE
   **/
  cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);

  window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();

  /**
   * Called to process 'ready' event. Only called after calling castReceiverManager.start(config) and the
   * system becomes ready to start receiving messages.
   *
   * @param {cast.receiver.CastReceiverManager.Event} event - can be null
   *
   * There is no default handler
   */
  window.castReceiverManager.onReady = function(event) {
    console.log("### Cast Receiver Manager is READY: " + JSON.stringify(event));
  }

  /**
   * If provided, it processes the 'senderconnected' event.
   * Called to process the 'senderconnected' event.
   * @param {cast.receiver.CastReceiverManager.Event} event - can be null
   *
   * There is no default handler
   */
  window.castReceiverManager.onSenderConnected = function(event) {
    console.log("### Cast Receiver Manager - Sender Connected : " + JSON.stringify(event));  

    // TODO - add sender and grab CastChannel from CastMessageBus.getCastChannel(senderId)
    var senders = window.castReceiverManager.getSenders();
  }

  /**
   * If provided, it processes the 'senderdisconnected' event.
   * Called to process the 'senderdisconnected' event.
   * @param {cast.receiver.CastReceiverManager.Event} event - can be null
   *
   * There is no default handler
   */
  window.castReceiverManager.onSenderDisconnected = function(event) {
    console.log("### Cast Receiver Manager - Sender Disconnected : " + JSON.stringify(event));

    var senders = window.castReceiverManager.getSenders();
  }

  /**
   * If provided, it processes the 'systemvolumechanged' event.
   * Called to process the 'systemvolumechanged' event.
   * @param {cast.receiver.CastReceiverManager.Event} event - can be null
   *
   * There is no default handler
   */
  window.castReceiverManager.onSystemVolumeChanged = function(event) {
    console.log("### Cast Receiver Manager - System Volume Changed : " + JSON.stringify(event));

    // See cast.receiver.media.Volume
    console.log("### Volume: " + event.data['level'] + " is muted? " + event.data['muted']);
  }

  /**
   * Called to process the 'visibilitychanged' event.
   *
   * Fired when the visibility of the application has changed (for example
   * after a HDMI Input change or when the TV is turned off/on and the cast
   * device is externally powered). Note that this API has the same effect as
   * the webkitvisibilitychange event raised by your document, we provided it
   * as CastReceiverManager API for convenience and to avoid a dependency on a
   * webkit-prefixed event.
   *
   * @param {cast.receiver.CastReceiverManager.Event} event - can be null
   *
   * There is no default handler for this event type.
   */
  window.castReceiverManager.onVisibilityChanged = function(event) {
    console.log("### Cast Receiver Manager - Visibility Changed : " + JSON.stringify(event));

    /** check if visible and pause media if not - add a timer to tear down after a period of time
             if visibilty does not change back **/
    if (event.data) { // It is visible
      window.mediaElement.play(); // Resume media playback
      window.clearTimeout(window.timeout); // Turn off the timeout
      window.timeout = null;
    } else {
      window.mediaElement.pause(); // Pause playback
      window.timeout = window.setTimeout(function() {
        window.close();
      }, 10000); // 10 Minute timeout
    }
  }


  /**
   * ALTERNATIVE TO onVisibilityChanged
   *
   * Use this to know when the user switched away from the Cast device input. It depends on the TV
   * Supporting CEC
   **/
  document.addEventListener('webkitvisibilitychange', function() {
    if (document.webkithidden) {
      window.mediaElement.pause(); // Pause playback
      window.timeout = window.setTimeout(function() {
        window.close();
      }, 10000); // 10 Minute timeout
    } else {
      window.mediaElement.play(); // Resume media playback
      window.clearTimeout(window.timeout); // Turn off the timeout
      window.timeout = null;
    }
  });


  /**
   * Use the messageBus to listen for incoming messages on a virtual channel using a namespace string.
   * Also use messageBus to send messages back to a sender or broadcast a message to all senders.
   * You can check the cast.receiver.CastMessageBus.MessageType that a message bus processes though a call
   * to getMessageType. As well, you get the namespace of a message bus by calling getNamespace()
   */
  window.messageBus = window.castReceiverManager.getCastMessageBus('urn:x-cast:com.google.devrel.custom');
  /**
   * The namespace urn:x-cast:com.google.devrel.custom is used to identify the protocol of showing/hiding
   * the heads up display messages (The messages defined at the beginning of the html).
   *
   * The protocol consists of one string message: show
   * In the case of the message value not being show - the assumed value is hide.
   **/
  window.messageBus.onMessage = function(event) {
    console.log("### Message Bus - Media Message: " + JSON.stringify(event));

    console.log("### CUSTOM MESSAGE: " + JSON.stringify(event));
    // show/hide messages
    console.log(event['data']);
    if (event['data'] === 'show') {
      document.getElementById('messages').style.display = 'block';
    } else {
      document.getElementById('messages').style.display = 'none';
    }
  }

  console.log('### Application Loaded. Starting system.');
  setHudMessage('applicationState', 'Loaded. Starting up.');

  /**
   * Application config
   **/
  var appConfig = new cast.receiver.CastReceiverManager.Config();

  /**
   * Text that represents the application status. It should meet
   * internationalization rules as may be displayed by the sender application.
   * @type {string|undefined}
   **/
  appConfig.statusText = 'Ready to play';

  /**
   * Maximum time in seconds before closing an idle
   * sender connection. Setting this value enables a heartbeat message to keep
   * the connection alive. Used to detect unresponsive senders faster than
   * typical TCP timeouts. The minimum value is 5 seconds, there is no upper
   * bound enforced but practically it's minutes before platform TCP timeouts
   * come into play. Default value is 10 seconds.
   * @type {number|undefined}
   **/
  appConfig.maxInactivity = 6000; // 10 minutes for testing, use default 10sec in prod by not setting this value

  /**
   * Initializes the system manager. The application should call this method when
   * it is ready to start receiving messages, typically after registering
   * to listen for the events it is interested on.
   */
  window.castReceiverManager.start(appConfig);
}
