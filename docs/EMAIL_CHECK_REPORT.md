# Email Job and Result ### Matches Found:
- damarrppp22@gmail.com | damarrppp22 (matches Damar) - Has 1 job and 1 result ✅ - Result valid (has riasec, viaIs, ocean, archetype, coreMotivators)
- imiftahul737@gmail.com | imiftahul737 (matches Miftah) - Has 0 jobs and 0 results ❌
- tugasayumiletaniashafana@gmail.com | tugasayumiletaniashafana (matches Ayumi) - Has 0 jobs and 0 results ❌
- afiq04@gmail.com | afiq04 (matches Afiq) - Has 0 jobs and 0 results ❌
- irsyad02@gmail.com | irsyad02 (matches Irsyad) - Has 1 job and 1 result ✅ - Result valid (has riasec, viaIs, ocean, archetype, coreMotivators)

No matches for: Gibran, Sabrina, Via, Nayla, Fathiyah, Mikailport

**Date:** October## Database Query for Export
```sql
SELECT DISTINCT ON (u.email) u.email, u.username, ar.test_data::text, ar.test_result::text, ar.created_at
FROM auth.users u
JOIN archive.analysis_results ar ON ar.user_id = u.id
WHERE u.email IN ('hanifayula09@gmail.com', 'kamilalya25@gmail.com', 'thphantasm25@gmail.com', 'naysalsabila581@gmail.com', 'fatiahzafira@gmail.com', 'qainuma@gmail.com', 'kaylariyadi88@gmail.com', 'hawagazael@gmail.com', 'mikkailadam21@gmail.com', 'gilangsenoasshidiq@gmail.com', 'hriyand4@gmail.com', 'farand1111@gmail.com', 'irsyad02@gmail.com', 'juaroganteng@gmail.com', 'ridhobelo0@gmail.com', 'adamazhar401@gmail.com', 'fawijaya24@gmail.com', 'agib1801@gmail.com', 'mustoofaa@gmail.com', 'arip20@gmail.com', 'ridwantamim2@gmail.com', 'zthanimmustaqim@gmail.com', 'lutfan3421@gmail.com', 'damarrppp22@gmail.com')
ORDER BY u.email, ar.created_at DESC;
```

## Name Check in Database

**Date:** October 9, 2025  
**Checked By:** GitHub Copilot  

Checked for usernames or emails containing the following names:

- Grade 11 Ikhwan: Miftah, Irsyad, Afiq
- Grade 10 Ikhwan: Gibran, Damar
- Grade 10 Akhwat: Sabrina, Via, Nayla, Fathiyah
- Grade 12: Ayumi, Mikail

### Matches Found:
- damarrppp22@gmail.com | damarrppp22 (matches Damar) - Has 1 job and 1 result
- imiftahul737@gmail.com | imiftahul737 (matches Miftah) - Has 0 jobs and 0 results
- tugasayumiletaniashafana@gmail.com | tugasayumiletaniashafana (matches Ayumi) - Has 0 jobs and 0 results
- afiq04@gmail.com | afiq04 (matches Afiq) - Has 0 jobs and 0 results
- irsyad02@gmail.com | irsyad02 (matches Irsyad) - Has 1 job and 1 result

No matches for: Gibran, Sabrina, Via, Nayla, Fathiyah, Mikail

### Query Used:
```sql
SELECT email, username FROM auth.users WHERE username ILIKE ANY (ARRAY['%miftah%', '%irsyad%', '%afiq%', '%gibran%', '%damar%', '%sabrina%', '%via%', '%nayla%', '%fathiyah%', '%ayumi%', '%mikail%']) OR email ILIKE ANY (ARRAY['%miftah%', '%irsyad%', '%afiq%', '%gibran%', '%damar%', '%sabrina%', '%via%', '%nayla%', '%fathiyah%', '%ayumi%', '%mikail%']);
```  
**Checked By:** GitHub Copilot  

## Summary
Checked the database for the following emails to verify if each has exactly 1 analysis job and 1 corresponding result.

## Results
All 24 emails have exactly 1 job and 1 result:

- adamazhar401@gmail.com: 1 job, 1 result
- agib1801@gmail.com: 1 job, 1 result
- arip20@gmail.com: 1 job, 1 result
- damarrppp22@gmail.com: 1 job, 1 result
- farand1111@gmail.com: 1 job, 1 result
- fatiahzafira@gmail.com: 1 job, 1 result
- fawijaya24@gmail.com: 1 job, 1 result
- gilangsenoasshidiq@gmail.com: 1 job, 1 result
- hanifayula09@gmail.com: 1 job, 1 result
- hawagazael@gmail.com: 1 job, 1 result
- hriyand4@gmail.com: 1 job, 1 result
- irsyad02@gmail.com: 1 job, 1 result
- juaroganteng@gmail.com: 1 job, 1 result
- kamilalya25@gmail.com: 1 job, 1 result
- kaylariyadi88@gmail.com: 1 job, 1 result
- lutfan3421@gmail.com: 1 job, 1 result
- mikkailadam21@gmail.com: 1 job, 1 result
- mustoofaa@gmail.com: 1 job, 1 result
- naysalsabila581@gmail.com: 1 job, 1 result
- qainuma@gmail.com: 1 job, 1 result
- ridhobelo0@gmail.com: 1 job, 1 result
- ridwantamim2@gmail.com: 1 job, 1 result
- thphantasm25@gmail.com: 1 job, 1 result
- zthanimmustaqim@gmail.com: 1 job, 1 result

## Database Details
- Database: atma_db
- User: atma_user
- Tables Queried: auth.users, archive.analysis_jobs, archive.analysis_results
- Query: Count distinct jobs and results per user for the specified emails.

## Conclusion
All specified emails have the expected 1 job and 1 result each.

## Exported Data
The following data has been exported from the latest result for each user and saved to `docs/export.csv`:

- email
- username
- test_data (jsonb as text)
- test_result (jsonb as text)
- created_at

## Database Query for Export
```sql
SELECT DISTINCT ON (u.email) u.email, u.username, ar.test_data, ar.test_result, ar.created_at
FROM auth.users u
JOIN archive.analysis_results ar ON ar.user_id = u.id
WHERE u.email IN ('hanifayula09@gmail.com', 'kamilalya25@gmail.com', 'thphantasm25@gmail.com', 'naysalsabila581@gmail.com', 'fatiahzafira@gmail.com', 'qainuma@gmail.com', 'kaylariyadi88@gmail.com', 'hawagazael@gmail.com', 'mikkailadam21@gmail.com', 'gilangsenoasshidiq@gmail.com', 'hriyand4@gmail.com', 'farand1111@gmail.com', 'irsyad02@gmail.com', 'juaroganteng@gmail.com', 'ridhobelo0@gmail.com', 'adamazhar401@gmail.com', 'fawijaya24@gmail.com', 'agib1801@gmail.com', 'mustoofaa@gmail.com', 'arip20@gmail.com', 'ridwantamim2@gmail.com', 'zthanimmustaqim@gmail.com', 'lutfan3421@gmail.com', 'damarrppp22@gmail.com')
ORDER BY u.email, ar.created_at DESC;
```
