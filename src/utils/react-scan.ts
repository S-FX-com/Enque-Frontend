import { scan } from 'react-scan';

if (process.env.NODE_ENV === 'development') {
  scan({
    // Habilita o scanner
    enabled: true,

    // Mostra logs no console
    log: true,

    // Configurações visuais
    //renderCountThreshold: 0, // Mostra a partir de 0 re-renders

    // Inclui todos os componentes
    // include: [/.*/],

    // Exclui componentes específicos
    // exclude: [/^DevTools/, /^Router/],

    // Configurações visuais do highlight
    //   outline: {
    //     color: 'red',
    //     size: 2,
    //   },
    // });
  });
}
