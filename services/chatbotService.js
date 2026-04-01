// services/chatbotService.js - AI Chatbot with ChatGPT Integration
const db = require('../config/db');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DAFFODIL_CONTEXT = `You are a helpful AI assistant for FixMyCampus, a campus reporting platform at Daffodil International University (DIU).

About Daffodil International University (DIU):
- Daffodil International University is a leading private university in Bangladesh
- Main campus is in Dhaka
- Known for strong programs in Engineering, IT, Business, and Creative Technology
- Departments include: Software Engineering, CSE, IT Management, Multimedia, EEE, Civil Engineering, Architecture, Business Administration, Real Estate, Tourism, Law, English, Journalism, Public Health, Pharmacy, Nutrition, Environmental Science, Agricultural Science
- Email format: @diu.edu.bd

About FixMyCampus Platform:
- A platform for students to report campus issues anonymously
- Features: Issue reporting, tracking, anonymous chat, group discussions, and AI assistant
- All reports and chats are anonymous using ANON-ID system
- Issues are categorized: Infrastructure, Internet Problems, Academic Issues, Harassment, Cleanliness, Security, Administration, Others
- Admin roles manage and resolve reported issues

When answering:
1. Be helpful and friendly
2. Provide accurate information about DIU departments and facilities
3. Help users with the FixMyCampus platform
4. For general DIU questions, provide context-appropriate answers
5. Maintain student privacy and encourage anonymous reporting of issues`;

const basicRules = [
  { keys: ['hello','hi','hey','start','help'], answer: `👋 Hi! I'm the FixMyCampus AI Assistant.\n\nI can help you with:\n• How to register & verify your account\n• How to submit a report\n• Tracking your report status\n• Anonymous chat & groups\n• Campus departments & categories\n• Questions about Daffodil International University\n\nWhat would you like to know?` },
  { keys: ['register','sign up','create account'], answer: `To register:\n1. Click Register on the homepage\n2. Use your @diu.edu.bd email\n3. Fill in name, password, role, department\n4. Check your email (or server terminal) for a 6-digit code\n5. Enter the code to verify\n\nYou'll get a unique Anonymous ID like ANON-AB1234 to protect your identity.` },
  { keys: ['verify','verification','code','email'], answer: `After registering, you receive a 6-digit code.\n\n• If email is not configured, the code appears in the server terminal window\n• Enter the code at the verification page\n• Codes expire in 15 minutes\n• Click "Resend" if needed` },
  { keys: ['report','submit','complaint','issue'], answer: `To report an issue:\n1. Log in and click "Report Issue"\n2. Enter a title and description\n3. Select a category (Infrastructure, Internet, etc.)\n4. Choose the relevant department\n5. Optionally upload images/PDFs\n6. Click Submit\n\nYou'll receive a unique Report ID and the admin will review it.` },
  { keys: ['track','status','progress','pending','resolved'], answer: `Report statuses:\n• Pending - waiting for admin review\n• In Progress - admin is working on it\n• Resolved - issue has been fixed\n• Rejected - could not be addressed\n\nGo to "My Reports" to see all your reports and admin responses.` },
];

const processMessage = async (userId, message, history = []) => {
  try {
    // Check if it matches basic rules first for faster response
    const lower = message.toLowerCase();
    const basicMatch = basicRules.find(r => r.keys.some(k => lower.includes(k)));
    
    let response;
    
    if (basicMatch) {
      response = basicMatch.answer;
    } else if (process.env.OPENAI_API_KEY) {
      // Use ChatGPT for more complex queries
      try {
        const messages = [
          {
            role: 'system',
            content: DAFFODIL_CONTEXT
          },
          ...history,
          {
            role: 'user',
            content: message
          }
        ];

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
        });

        response = completion.choices[0]?.message?.content || 'I could not generate a response. Please try again.';
      } catch (apiError) {
        console.error('OpenAI API error:', apiError.message);
        // Fall back to generic response if API fails
        response = `I'm unable to process complex queries right now. Try asking about:\n• Registration & verification\n• How to report issues\n• Report tracking\n• Campus departments\n• DIU information`;
      }
    } else {
      response = `I'm not sure about that. Try asking about:\n• Registration\n• Reporting issues\n• Tracking status\n• Anonymous chat\n• Campus departments`;
    }

    // Log the conversation
    try {
      await db.query('INSERT INTO AI_Chat_Log (user_id, user_message, bot_response) VALUES (?,?,?)',
        [userId, message, response]);
    } catch (e) { /* ignore log errors */ }

    return response;
  } catch (error) {
    console.error('Chatbot error:', error);
    return `I'm having trouble right now. Try asking about:\n• How to register\n• How to submit a report\n• Tracking your reports\n• Campus departments`;
  }
};

module.exports = { processMessage };
