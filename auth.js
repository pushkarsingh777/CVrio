const path = require('path');
const dotenvPath = path.join(__dirname, '.env');
console.log('🔍 Looking for .env at:', dotenvPath);

const dotenvResult = require('dotenv').config({ path: dotenvPath });
console.log('🔍 Dotenv result:', dotenvResult);
console.log('🔍 Current working directory:', process.cwd());
console.log('🔍 Debug - Environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');

const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// 🔧 Configuration Structure
const envConfig = {
  // Database Configuration
  database: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    required: true
  },
  
  // OAuth Configuration
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
      required: true
    }
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    required: false
  }
};

// 🔍 Validation Function
function validateConfig() {
  const missingVars = [];
  
  if (!envConfig.database.url) missingVars.push('SUPABASE_URL');
  if (!envConfig.database.key) missingVars.push('SUPABASE_ANON_KEY');
  if (!envConfig.oauth.google.clientId) missingVars.push('GOOGLE_CLIENT_ID');
  if (!envConfig.oauth.google.clientSecret) missingVars.push('GOOGLE_CLIENT_SECRET');
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables. Please check your .env file.');
    console.log('Required variables:', missingVars.join(', '));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
}

// Validate configuration on startup
validateConfig();

// 📦 Initialize Supabase client using config
const supabase = createClient(envConfig.database.url, envConfig.database.key);

// 🔧 Middleware
app.use(express.json());
app.use(express.static('public'));

// Simple in-memory user storage (for demo purposes)
let currentUser = null;

// 🏠 Home route
app.get('/', (req, res) => {
  if (currentUser) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CVrio - Welcome</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .profile-img { border-radius: 50%; width: 100px; height: 100px; margin: 20px 0; }
          .btn { padding: 10px 20px; margin: 10px; text-decoration: none; background-color: #4285f4; color: white; border-radius: 5px; display: inline-block; }
          .btn:hover { background-color: #357ae8; }
          .logout-btn { background-color: #dc3545; }
          .logout-btn:hover { background-color: #c82333; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎉 Welcome to CVrio!</h1>
          <h2>Hello, ${currentUser.name}!</h2>
          <img src="${currentUser.picture}" alt="Profile Picture" class="profile-img">
          <p><strong>Email:</strong> ${currentUser.email}</p>
          <div>
            <a href="/profile" class="btn">View Profile API</a>
            <a href="/logout" class="btn logout-btn">Logout</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CVrio - Login</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
          .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .google-btn { 
            display: inline-flex; 
            align-items: center; 
            padding: 12px 24px; 
            background-color: #4285f4; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            font-size: 16px;
            margin-top: 20px;
          }
          .google-btn:hover { background-color: #357ae8; }
          .google-icon { margin-right: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📋 CVrio</h1>
          <h2>Welcome! Please sign in to continue.</h2>
          <p>Secure authentication with Google</p>
          <a href="/auth/google" class="google-btn">
            <span class="google-icon">🔐</span>
            Sign in with Google
          </a>
        </div>
      </body>
      </html>
    `);
  }
});

// 🌐 Start OAuth flow - Using config structure
app.get('/auth/google', (req, res) => {
  console.log('🚀 Starting Google OAuth flow...');
  
  const scope = encodeURIComponent('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${envConfig.oauth.google.clientId}&redirect_uri=${envConfig.oauth.google.redirectUri}&response_type=code&scope=${scope}&access_type=offline`;
  
  console.log('🔗 Redirecting to:', authUrl);
  res.redirect(authUrl);
});

// 🔁 Callback handler - Using config structure
app.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('❌ OAuth Error:', error);
    return res.status(400).send(`
      <h2>❌ Authentication Error</h2>
      <p>Error: ${error}</p>
      <a href="/">Try Again</a>
    `);
  }

  if (!code) {
    console.error('❌ No authorization code provided');
    return res.status(400).send(`
      <h2>❌ Authentication Failed</h2>
      <p>No authorization code provided</p>
      <a href="/">Try Again</a>
    `);
  }

  try {
    console.log('🔄 Exchanging code for access token...');
    
    // 1. Exchange code for access token - Using config
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: envConfig.oauth.google.clientId,
        client_secret: envConfig.oauth.google.clientSecret,
        redirect_uri: envConfig.oauth.google.redirectUri,
        grant_type: 'authorization_code',
      },
    });

    const { access_token } = tokenResponse.data;
    console.log('✅ Access token received');

    // 2. Get user info
    console.log('👤 Fetching user information...');
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const user = userResponse.data;
    console.log('✅ User info received:', { email: user.email, name: user.name });

    // 3. Insert/update in Supabase
    console.log('💾 Storing user in Supabase...');
    
    const { data, error: supabaseError } = await supabase
      .from('users')
      .upsert({
        email: user.email,
        name: user.name,
        picture: user.picture,
        google_id: user.id,
        last_login: new Date().toISOString(),
      }, { onConflict: 'email' });

    if (supabaseError) {
      console.error('❌ Supabase Error Details:', {
        message: supabaseError.message,
        details: supabaseError.details,
        hint: supabaseError.hint,
        code: supabaseError.code
      });
      
      return res.status(500).send(`
        <h2>❌ Database Error</h2>
        <p>Failed to store user: ${supabaseError.message}</p>
        <p><strong>Hint:</strong> ${supabaseError.hint || 'Check your Supabase table configuration'}</p>
        <a href="/">Try Again</a>
      `);
    }

    console.log('✅ User stored successfully in Supabase');

    // 4. Store user in memory
    currentUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture
    };

    console.log('🎉 Authentication successful for:', user.email);
    res.redirect('/');
    
  } catch (err) {
    console.error('❌ Authentication Error:', err.message);
    
    if (err.response) {
      console.error('API Response Error:', {
        status: err.response.status,
        data: err.response.data
      });
    }
    
    res.status(500).send(`
      <h2>❌ Authentication Failed</h2>
      <p>Error: ${err.message}</p>
      <a href="/">Try Again</a>
    `);
  }
});

// 🚪 Logout route
app.get('/logout', (req, res) => {
  if (currentUser) {
    console.log('👋 User logged out:', currentUser.email);
    currentUser = null;
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CVrio - Logged Out</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
        .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .btn { padding: 10px 20px; margin: 10px; text-decoration: none; background-color: #4285f4; color: white; border-radius: 5px; display: inline-block; }
        .btn:hover { background-color: #357ae8; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>👋 Successfully Logged Out</h2>
        <p>Thank you for using CVrio!</p>
        <a href="/" class="btn">Sign In Again</a>
      </div>
    </body>
    </html>
  `);
});

// 🛡️ Protected route example
app.get('/profile', (req, res) => {
  if (!currentUser) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please log in first',
      loginUrl: '/auth/google'
    });
  }
  
  res.json({
    message: 'This is a protected route',
    user: currentUser,
    timestamp: new Date().toISOString()
  });
});

// 📊 Health check route - Using config
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: envConfig.server.nodeEnv,
    authenticated: !!currentUser,
    config: {
      port: envConfig.server.port,
      hasDatabase: !!envConfig.database.url,
      hasGoogleOAuth: !!envConfig.oauth.google.clientId,
    }
  });
});

// 🔧 Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Error:', err);
  res.status(500).send(`
    <h2>❌ Something went wrong!</h2>
    <p>Please try again later.</p>
    <a href="/">Go Home</a>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <h2>🔍 Page Not Found</h2>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/">Go Home</a>
  `);
});

// 🟢 Start server - Using config
app.listen(envConfig.server.port, () => {
  console.log('🚀 CVrio OAuth Server Started!');
  console.log(`📱 Server running at: http://localhost:${envConfig.server.port}`);
  console.log(`🔗 Google OAuth: http://localhost:${envConfig.server.port}/auth/google`);
  console.log(`👤 Profile API: http://localhost:${envConfig.server.port}/profile`);
  console.log(`❤️  Health Check: http://localhost:${envConfig.server.port}/health`);
  console.log('');
  console.log('📋 Configuration loaded successfully!');
  console.log(`   Environment: ${envConfig.server.nodeEnv}`);
  console.log(`   Database: ${envConfig.database.url ? 'Connected' : 'Not configured'}`);
  console.log(`   OAuth: ${envConfig.oauth.google.clientId ? 'Configured' : 'Not configured'}`);
});