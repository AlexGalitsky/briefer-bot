/**
 * Селекторы Yandex Telemost.
 *
 * Приоритет: data-testid (стабильные) → partial class match → хешированные классы.
 * При обновлении UI Telemost обновляйте этот файл — см. docs/risks-refactoring.md
 */
export const TELEMOST_SELECTORS = {
  /** «Продолжить в браузере» */
  continueBtn: [
    'button[data-testid="orb-button"]',
    'button[class*="continueInBrowserButton"]',
    'button.continueInBrowserButton_-wewF',
  ].join(', '),

  nameInput: 'input[data-testid="orb-textinput-input"]',

  joinBtn: 'button[data-testid="enter-conference-button"]',

  /** Активный аудиопоток конференции */
  liveAudio: [
    'audio[data-g_track_muted="false"]',
    'audio.goloom_mid_audio[data-g_track_muted="false"]',
    'audio[class*="goloom_mid_audio"][data-g_track_muted="false"]',
  ].join(', '),

  /** Карточка участника в списке */
  participantCard: [
    '[class*="item_"]',
    '.item_NZ2DW',
  ].join(', '),

  /** Корневой блок карточки (для класса «говорит») */
  cardRoot: [
    '[class*="root_"]',
    '.root_ypmDo',
  ].join(', '),

  /** CSS-класс рамки активного спикера (без точки — для classList.contains) */
  speakingStrokeClass: 'rootStroke_Kb2PJ',

  /** Имя участника */
  speakerName: [
    '[class*="TextName"]',
    '.TextName_BOaIg',
  ].join(', '),
} as const;

/** Селекторы, передаваемые в page.evaluate (plain object) */
export function getTelemostPageSelectors() {
  return {
    liveAudio: TELEMOST_SELECTORS.liveAudio,
    participantCard: TELEMOST_SELECTORS.participantCard,
    cardRoot: TELEMOST_SELECTORS.cardRoot,
    speakingStrokeClass: TELEMOST_SELECTORS.speakingStrokeClass,
    speakerName: TELEMOST_SELECTORS.speakerName,
  };
}
