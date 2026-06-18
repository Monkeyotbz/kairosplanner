import { useState, useEffect, useRef, useCallback } from 'react';

export function useKairosVoice(options = {}) {
  const { lang = 'es-ES', onResult } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const finalBufferRef = useRef('');
  const manualStopRef = useRef(false);
  const minConfidenceRef = useRef(1);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('La Web Speech API no está soportada en este navegador.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true; // Permite pausas sin cortarse
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
      manualStopRef.current = false;
    };

    recognition.onresult = (event) => {
      let interim = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          currentFinal += event.results[i][0].transcript + ' ';
          const conf = event.results[i][0].confidence;
          if (conf > 0 && conf < minConfidenceRef.current) minConfidenceRef.current = conf;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (currentFinal) {
        finalBufferRef.current += currentFinal;
      }

      // El texto a mostrar es lo final acumulado más lo que se está diciendo ahora
      setTranscript(finalBufferRef.current + interim);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.error('Error en reconocimiento de voz:', event.error);
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [lang]);

  // Manejo de reinicio automático si el navegador corta por silencio prolongado,
  // pero el usuario no ha presionado "parar"
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = () => {
        if (isListening && !manualStopRef.current) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error(error);
          }
        } else if (manualStopRef.current) {
          setIsListening(false);
        }
      };
    }
  }, [isListening]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      finalBufferRef.current = '';
      minConfidenceRef.current = 1;
      setTranscript('');
      manualStopRef.current = false;
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error al iniciar micrófono:', error);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      manualStopRef.current = true;
      setIsListening(false);
      recognitionRef.current.stop();

      // Procesar el texto final total (usamos el transcript del estado por si hay interims sueltos)
      setTranscript(prevTranscript => {
        const finalToProcess = prevTranscript.trim();
        if (finalToProcess && onResultRef.current) {
          onResultRef.current(finalToProcess, minConfidenceRef.current);
        }
        return finalToProcess;
      });
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
  };
}