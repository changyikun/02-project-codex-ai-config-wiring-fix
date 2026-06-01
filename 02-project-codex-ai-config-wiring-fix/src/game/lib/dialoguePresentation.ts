const directAddressPattern = /^(娘娘|小主|姑娘|公主|皇后娘娘)[，,]/u;
const jiaojiaoSpeechCuePattern = /娇娇[^。！？\n]*(回禀|低声提醒|轻声|小声|提醒|道|说)[：:“「]/u;

export const isJiaojiaoSpokenText = (text: string): boolean => {
  const normalized = text.trim();
  return directAddressPattern.test(normalized) || jiaojiaoSpeechCuePattern.test(normalized);
};
