import { translations, languageOptions, AppLanguage } from './translations';
import { TranslationDictionary } from './types';

interface AuditResult {
  code: AppLanguage;
  name: string;
  totalRequiredKeys: number;
  presentKeys: number;
  missingKeys: string[];
  emptyKeys: string[];
  completenessPercentage: number;
}

export function runLocalizationAudit(): {
  success: boolean;
  results: AuditResult[];
  summary: { totalLanguages: number; perfectLanguages: number; totalIssues: number };
} {
  const masterKeys = Object.keys(translations.en) as (keyof TranslationDictionary)[];
  const results: AuditResult[] = [];
  let totalIssues = 0;

  for (const opt of languageOptions) {
    const langCode = opt.code;
    const dict = translations[langCode];
    const missingKeys: string[] = [];
    const emptyKeys: string[] = [];
    let presentCount = 0;

    for (const key of masterKeys) {
      if (!(key in dict) || dict[key] === undefined) {
        missingKeys.push(key);
      } else if (typeof dict[key] !== 'string' || dict[key].trim().length === 0) {
        emptyKeys.push(key);
      } else {
        presentCount++;
      }
    }

    const issues = missingKeys.length + emptyKeys.length;
    totalIssues += issues;

    results.push({
      code: langCode,
      name: `${opt.native} (${opt.label})`,
      totalRequiredKeys: masterKeys.length,
      presentKeys: presentCount,
      missingKeys,
      emptyKeys,
      completenessPercentage: Math.round((presentCount / masterKeys.length) * 100),
    });
  }

  const perfectLanguages = results.filter((r) => r.missingKeys.length === 0 && r.emptyKeys.length === 0).length;

  return {
    success: totalIssues === 0,
    results,
    summary: {
      totalLanguages: languageOptions.length,
      perfectLanguages,
      totalIssues,
    },
  };
}

// Execute standalone if run directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('localizationAudit')) {
  console.log('========================================================================');
  console.log('  VOICEFLOW COMPLETE 13-LANGUAGE MULTILINGUAL LOCALIZATION AUDIT');
  console.log('========================================================================\n');

  const audit = runLocalizationAudit();

  console.log('| #  | Language | Code | Required | Present | Missing | Empty | Completeness |');
  console.log('|----|----------|------|----------|---------|---------|-------|--------------|');
  audit.results.forEach((r, i) => {
    const num = (i + 1).toString().padEnd(2);
    const lang = r.name.padEnd(20);
    const code = r.code.padEnd(8);
    const req = r.totalRequiredKeys.toString().padEnd(8);
    const pres = r.presentKeys.toString().padEnd(7);
    const miss = r.missingKeys.length.toString().padEnd(7);
    const emp = r.emptyKeys.length.toString().padEnd(5);
    const pct = `${r.completenessPercentage}%`.padEnd(12);
    console.log(`| ${num} | ${lang} | ${code} | ${req} | ${pres} | ${miss} | ${emp} | ${pct} |`);
  });

  console.log('\n------------------------------------------------------------------------');
  console.log(`Total Languages Tested: ${audit.summary.totalLanguages}`);
  console.log(`100% Fully Localized Languages: ${audit.summary.perfectLanguages} / ${audit.summary.totalLanguages}`);
  console.log(`Total Translation Issues: ${audit.summary.totalIssues}`);
  console.log('------------------------------------------------------------------------');

  if (!audit.success) {
    console.error('\n❌ LOCALIZATION AUDIT FAILED! Details:');
    audit.results.filter(r => r.missingKeys.length > 0 || r.emptyKeys.length > 0).forEach(r => {
      console.error(`- ${r.name} (${r.code}): Missing: [${r.missingKeys.join(', ')}], Empty: [${r.emptyKeys.join(', ')}]`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ LOCALIZATION AUDIT PASSED! All 13 languages are 100% complete with 0 missing keys.\n');
  }
}
