importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyA5EigXpyiczdV4k6BSNSxrxtxyYT_FjaA',
  authDomain: 'copakaleo.firebaseapp.com',
  projectId: 'copakaleo',
  storageBucket: 'copakaleo.firebasestorage.app',
  messagingSenderId: '966505093433',
  appId: '1:966505093433:web:c15a187aca147de887f0e8',
});

firebase.messaging();
