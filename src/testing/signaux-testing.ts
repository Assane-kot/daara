import { Provider } from '@angular/core';
import { SignauxDaaraService } from '../app/core/daara/signaux-daara.service';

/** Signaux de la daara neutralisés dans les tests de composants : aucun canal Realtime ouvert. */
export function provideSignauxTesting(surveiller: () => void = () => undefined): Provider {
    return { provide: SignauxDaaraService, useValue: { surveiller } };
}
