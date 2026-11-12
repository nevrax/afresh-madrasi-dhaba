import { LegacyScoreClient, LegacyServiceError, type ExternalScore, type LegacyResult } from '../services/legacy-scores.js';

export type ScoreFormState = 'hidden' | 'ready' | 'unavailable' | 'sending' | 'received' | 'failed';
export interface LegacyScoreFormElements { form: HTMLFormElement; input: HTMLInputElement; submit: HTMLButtonElement; status: HTMLElement }
export interface LegacyScoreForm {
  show(score: number): void;
  hide(): void;
  state(): ScoreFormState;
  dispose(): void;
}

/** Source-compatible external name/score submission with explicit modern error feedback.
 * The original hides the form immediately after sendAndLoad; it does not confirm success.
 * Failed/unknown submissions allow an explicit manual retry, never an automatic POST.
 */
export function connectLegacyScoreForm(elements: LegacyScoreFormElements, client: LegacyScoreClient, changed: (state: ScoreFormState) => void = () => undefined): LegacyScoreForm {
  const { form, input, submit, status } = elements;
  let phase: ScoreFormState = 'hidden';
  let score = 0;
  let generation = 0;
  let pending: AbortController | undefined;
  const setPhase = (value: ScoreFormState, message = ''): void => {
    phase = value;
    form.hidden = value === 'hidden' || value === 'sending' || value === 'received';
    submit.disabled = value === 'sending' || value === 'unavailable' || value === 'received';
    status.textContent = message;
    changed(value);
  };
  const receivedMessage = (result: LegacyResult): string => result.postResult === null
    ? 'The score service responded without a result. Score acceptance is unconfirmed.'
    : `Score service response: ${result.postResult}`;
  const send = (event: SubmitEvent): void => {
    event.preventDefault();
    if (!['ready', 'failed'].includes(phase)) return;
    const requestGeneration = generation;
    const payload: ExternalScore = { score, name: input.value };
    pending = new AbortController();
    setPhase('sending', 'Sending score…');
    void client.submitExternal(payload, pending.signal).then(result => {
      if (generation === requestGeneration) setPhase('received', receivedMessage(result));
    }).catch(error => {
      if (generation !== requestGeneration) return;
      const message = error instanceof LegacyServiceError ? error.message : 'The score request failed. Submission status is unknown.';
      setPhase('failed', `${message} You can retry manually; an earlier request may already have reached the server.`);
    });
  };
  input.required = false;
  input.removeAttribute('maxlength');
  input.autocomplete = 'off';
  form.noValidate = true;
  submit.textContent = 'Submit';
  status.setAttribute('role', 'status');
  form.addEventListener('submit', send);
  setPhase('hidden');
  const hide = (): void => { generation++; pending?.abort(); pending = undefined; setPhase('hidden'); };
  return {
    show(value) {
      generation++; pending?.abort(); pending = undefined;
      score = value; input.value = 'noname';
      setPhase(client.available() ? 'ready' : 'unavailable', client.available() ? '' : 'Online scores are unavailable: no score service is configured. Your score has not been sent.');
    },
    hide,
    state: () => phase,
    dispose() { hide(); form.removeEventListener('submit', send); },
  };
}
