// ============================================================
// LE COMBAT DES CAVES — 2D Fighting Game
// ============================================================

const FIGHTERS = [
    'antoine', 'arnaud', 'bauj', 'bec', 'clement',
    'damien', 'elwe', 'florent', 'jo', 'jomain',
    'julien', 'laot', 'n2b', 'quentin', 'rouv'
];

const FIGHTER_COLORS = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7',
    '#fd79a8', '#00b894', '#e17055', '#0984e3', '#fdcb6e',
    '#e056fd', '#22a6b3', '#f0932b', '#eb4d4b', '#7ed6df'
];

// ============================================================
// STATE
// ============================================================

const state = {
    screen: 'select',
    selectPhase: 1, // 1 = picking, 2 = picked (bot auto-assigned)
    p1Fighter: null,
    p2Fighter: null,
    fight: null,
    paused: false,
    soundEnabled: false,
    audioCtx: null,
    matchStats: { p1Damage: 0, p2Damage: 0, p1MaxCombo: 0, p2MaxCombo: 0 }
};

// ============================================================
// CONSTANTS
// ============================================================

const GROUND_Y = 0.78;
const FIGHTER_W = 60;
const FIGHTER_H = 100;
const HEAD_RADIUS = 28;
const MOVE_SPEED = 4;
const JUMP_FORCE = -12;
const GRAVITY = 0.55;
const MAX_HEALTH = 100;
const LIGHT_DAMAGE = 6;
const HEAVY_DAMAGE = 14;
const SPECIAL_DAMAGE = 22;
const LIGHT_DURATION = 12;
const HEAVY_DURATION = 20;
const SPECIAL_DURATION = 28;
const SPECIAL_COOLDOWN = 180; // frames (~3s)
const HIT_STUN = 15;
const COMBO_WINDOW = 60; // frames (~1s)
const KNOCKBACK_LIGHT = 8;
const KNOCKBACK_HEAVY = 16;
const KNOCKBACK_SPECIAL = 24;
const ROUND_TIME = 99;

// ============================================================
// PRELOAD IMAGES
// ============================================================

const fighterImages = {};

function preloadImages() {
    FIGHTERS.forEach(name => {
        const img = new Image();
        img.src = 'players/' + name + '.png';
        fighterImages[name] = img;
    });
}

// ============================================================
// AUDIO (Web Audio API)
// ============================================================

function getAudioCtx() {
    if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return state.audioCtx;
}

function playSound(type) {
    if (!state.soundEnabled) return;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    if (type === 'punch') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'kick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'special') {
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(600, now);
        osc2.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.3);
        osc2.stop(now + 0.3);
    } else if (type === 'ko') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
    } else if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'beep-high') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'combo') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const pitch = 500 + Math.random() * 300;
        osc.frequency.setValueAtTime(pitch, now);
        osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    }
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById('screen-' + name);
    if (screen) screen.classList.add('active');
    state.screen = name;
}

// ============================================================
// CHARACTER SELECT
// ============================================================

function buildRoster() {
    const grid = document.getElementById('roster-grid');
    grid.innerHTML = '';
    FIGHTERS.forEach((name, idx) => {
        const card = document.createElement('div');
        card.className = 'roster-card';
        card.dataset.fighter = name;
        card.innerHTML =
            '<div class="roster-avatar"><img src="players/' + name + '.png" alt="' + name + '"></div>' +
            '<div class="roster-name">' + name + '</div>';
        grid.appendChild(card);
    });
}

function pickRandomBot(exclude) {
    const available = FIGHTERS.filter(f => f !== exclude);
    return available[Math.floor(Math.random() * available.length)];
}

function updateSelectUI() {
    const instruction = document.getElementById('select-instruction');
    const btnFight = document.getElementById('btn-fight');
    const cards = document.querySelectorAll('.roster-card');

    cards.forEach(card => {
        card.classList.remove('selected-p1', 'selected-p2', 'dimmed');
        const name = card.dataset.fighter;
        if (name === state.p1Fighter) card.classList.add('selected-p1');
        if (name === state.p2Fighter) card.classList.add('selected-p2');
    });

    const p1PreviewAvatar = document.getElementById('p1-preview-avatar');
    const p1PreviewName = document.getElementById('p1-preview-name');
    const p2PreviewAvatar = document.getElementById('p2-preview-avatar');
    const p2PreviewName = document.getElementById('p2-preview-name');

    if (state.p1Fighter) {
        p1PreviewAvatar.innerHTML = '<img src="players/' + state.p1Fighter + '.png" alt="' + state.p1Fighter + '">';
        p1PreviewName.textContent = state.p1Fighter.toUpperCase();
    } else {
        p1PreviewAvatar.innerHTML = '';
        p1PreviewName.textContent = '???';
    }

    if (state.p2Fighter) {
        p2PreviewAvatar.innerHTML = '<img src="players/' + state.p2Fighter + '.png" alt="' + state.p2Fighter + '">';
        p2PreviewName.textContent = state.p2Fighter.toUpperCase() + ' (ORDI)';
    } else {
        p2PreviewAvatar.innerHTML = '';
        p2PreviewName.textContent = '???';
    }

    if (state.selectPhase === 1) {
        instruction.textContent = 'CHOISIS TON CAVE';
        btnFight.classList.add('hidden');
    } else {
        instruction.textContent = '';
        btnFight.classList.remove('hidden');
    }
}

function handleRosterClick(e) {
    const card = e.target.closest('.roster-card');
    if (!card) return;
    const name = card.dataset.fighter;

    if (state.selectPhase === 1) {
        state.p1Fighter = name;
        state.p2Fighter = pickRandomBot(name);
        state.selectPhase = 2;
    } else {
        return;
    }
    updateSelectUI();
}

function resetSelect() {
    state.p1Fighter = null;
    state.p2Fighter = null;
    state.selectPhase = 1;
    bot.thinkTimer = 0;
    bot.currentAction = null;
    bot.actionTimer = 0;
    bot.attackChoice = null;
    updateSelectUI();
}

// ============================================================
// FIGHT ENGINE
// ============================================================

function createFighter(name, playerNum, canvasW, canvasH) {
    const groundY = canvasH * GROUND_Y;
    const startX = playerNum === 1 ? canvasW * 0.25 : canvasW * 0.75;
    return {
        name: name,
        player: playerNum,
        x: startX,
        y: groundY,
        vx: 0,
        vy: 0,
        width: FIGHTER_W,
        height: FIGHTER_H,
        health: MAX_HEALTH,
        displayHealth: MAX_HEALTH,
        ghostHealth: MAX_HEALTH,
        facing: playerNum === 1 ? 1 : -1,
        grounded: true,
        crouching: false,
        attacking: false,
        attackType: null,
        attackFrame: 0,
        attackDuration: 0,
        attackHit: false,
        hitStun: 0,
        hitFlash: 0,
        specialCooldown: 0,
        combo: 0,
        comboTimer: 0,
        maxCombo: 0,
        totalDamage: 0,
        koAnimation: 0,
        isKO: false,
        groundY: groundY,
        color: playerNum === 1 ? '#ff2d55' : '#00d4ff'
    };
}

function startFight() {
    const canvas = document.getElementById('arena-canvas');
    const canvasW = window.innerWidth;
    const canvasH = window.innerHeight;
    canvas.width = canvasW;
    canvas.height = canvasH;

    state.fight = {
        p1: createFighter(state.p1Fighter, 1, canvasW, canvasH),
        p2: createFighter(state.p2Fighter, 2, canvasW, canvasH),
        round: 1,
        p1Rounds: 0,
        p2Rounds: 0,
        timer: ROUND_TIME * 60,
        phase: 'countdown', // countdown, fighting, ko, roundEnd, matchEnd
        countdownVal: 3,
        countdownTimer: 0,
        particles: [],
        slowmo: 0,
        shakeX: 0,
        shakeY: 0,
        canvasW: canvasW,
        canvasH: canvasH,
        bgStars: [],
        bgOffset: 0
    };

    // Generate background stars
    for (let i = 0; i < 80; i++) {
        state.fight.bgStars.push({
            x: Math.random() * canvasW,
            y: Math.random() * canvasH * 0.7,
            size: Math.random() * 2 + 0.5,
            brightness: Math.random() * 0.5 + 0.2,
            layer: Math.random() < 0.5 ? 0 : 1
        });
    }

    state.matchStats = { p1Damage: 0, p2Damage: 0, p1MaxCombo: 0, p2MaxCombo: 0 };

    showScreen('fight');
    updateHUD();
    startCountdown();
}

function updateHUD() {
    const f = state.fight;
    if (!f) return;

    document.getElementById('hud-p1-avatar').src = 'players/' + f.p1.name + '.png';
    document.getElementById('hud-p2-avatar').src = 'players/' + f.p2.name + '.png';
    document.getElementById('hud-p1-name').textContent = f.p1.name.toUpperCase();
    document.getElementById('hud-p2-name').textContent = f.p2.name.toUpperCase();

    // Round dots
    const p1Rounds = document.getElementById('p1-rounds');
    const p2Rounds = document.getElementById('p2-rounds');
    p1Rounds.innerHTML = '';
    p2Rounds.innerHTML = '';
    for (let i = 0; i < 2; i++) {
        const d1 = document.createElement('div');
        d1.className = 'round-dot' + (i < f.p1Rounds ? ' won' : '');
        p1Rounds.appendChild(d1);
        const d2 = document.createElement('div');
        d2.className = 'round-dot' + (i < f.p2Rounds ? ' won' : '');
        p2Rounds.appendChild(d2);
    }
}

function updateHealthBars() {
    const f = state.fight;
    if (!f) return;

    const p1Pct = Math.max(0, f.p1.displayHealth / MAX_HEALTH * 100);
    const p1Ghost = Math.max(0, f.p1.ghostHealth / MAX_HEALTH * 100);
    const p2Pct = Math.max(0, f.p2.displayHealth / MAX_HEALTH * 100);
    const p2Ghost = Math.max(0, f.p2.ghostHealth / MAX_HEALTH * 100);

    document.getElementById('p1-health-bar').style.width = p1Pct + '%';
    document.getElementById('p1-health-ghost').style.width = p1Ghost + '%';
    document.getElementById('p2-health-bar').style.width = p2Pct + '%';
    document.getElementById('p2-health-ghost').style.width = p2Ghost + '%';

    document.getElementById('fight-timer').textContent = Math.ceil(f.timer / 60);

    // Cooldowns
    const p1CdPct = Math.max(0, 1 - f.p1.specialCooldown / SPECIAL_COOLDOWN) * 100;
    const p2CdPct = Math.max(0, 1 - f.p2.specialCooldown / SPECIAL_COOLDOWN) * 100;
    document.getElementById('p1-cooldown-fill').style.width = p1CdPct + '%';
    document.getElementById('p2-cooldown-fill').style.width = p2CdPct + '%';
}

function showAnnouncement(text, duration) {
    const el = document.getElementById('announcement');
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration || 1500);
}

function startCountdown() {
    const f = state.fight;
    f.phase = 'countdown';
    f.countdownVal = 3;
    f.countdownTimer = 0;
    showAnnouncement('ROUND ' + f.round, 1000);

    setTimeout(() => {
        showAnnouncement('3', 800);
        playSound('beep');
    }, 1200);
    setTimeout(() => {
        showAnnouncement('2', 800);
        playSound('beep');
    }, 2100);
    setTimeout(() => {
        showAnnouncement('1', 800);
        playSound('beep');
    }, 3000);
    setTimeout(() => {
        showAnnouncement('BASTON !', 800);
        playSound('beep-high');
        f.phase = 'fighting';
    }, 3900);
}

function screenShake(intensity) {
    const f = state.fight;
    if (!f) return;
    f.shakeX = (Math.random() - 0.5) * intensity;
    f.shakeY = (Math.random() - 0.5) * intensity;
    const fightScreen = document.getElementById('screen-fight');
    fightScreen.classList.remove('shake', 'shake-heavy');
    void fightScreen.offsetWidth; // force reflow
    fightScreen.classList.add(intensity > 10 ? 'shake-heavy' : 'shake');
}

// ============================================================
// PARTICLES
// ============================================================

function spawnHitParticles(x, y, count, color) {
    const f = state.fight;
    for (let i = 0; i < count; i++) {
        f.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 3,
            life: 20 + Math.random() * 15,
            maxLife: 35,
            size: 3 + Math.random() * 4,
            color: color || '#ffd600'
        });
    }
}

function updateParticles() {
    const f = state.fight;
    for (let i = f.particles.length - 1; i >= 0; i--) {
        const p = f.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life--;
        if (p.life <= 0) f.particles.splice(i, 1);
    }
}

// ============================================================
// INPUT HANDLING
// ============================================================

const keys = {};

function handleKeyDown(e) {
    keys[e.code] = true;

    if (e.code === 'Escape') {
        e.preventDefault();
        if (state.screen === 'fight' && state.fight && state.fight.phase === 'fighting') {
            togglePause();
        } else if (state.paused) {
            togglePause();
        }
    }
}

function handleKeyUp(e) {
    keys[e.code] = false;
}

function togglePause() {
    state.paused = !state.paused;
    const pauseScreen = document.getElementById('screen-pause');
    if (state.paused) {
        pauseScreen.classList.add('active');
    } else {
        pauseScreen.classList.remove('active');
    }
}

const touchState = { left: false, right: false, up: false, down: false, punch: false, kick: false, special: false };

function getP1Input() {
    return {
        left: !!keys['KeyQ'] || !!keys['KeyA'] || touchState.left,
        right: !!keys['KeyD'] || touchState.right,
        jump: !!keys['KeyZ'] || !!keys['KeyW'] || touchState.up,
        crouch: !!keys['KeyS'] || touchState.down,
        punch: !!keys['KeyF'] || touchState.punch,
        kick: !!keys['KeyG'] || touchState.kick,
        special: !!keys['KeyH'] || touchState.special
    };
}

// ============================================================
// BOT AI
// ============================================================

const bot = {
    thinkTimer: 0,
    currentAction: null, // 'approach', 'retreat', 'attack', 'jump', 'idle'
    actionTimer: 0,
    attackChoice: null
};

function getBotInput(botFighter, player) {
    const input = { left: false, right: false, jump: false, crouch: false, punch: false, kick: false, special: false };
    const dx = player.x - botFighter.x;
    const dist = Math.abs(dx);
    const facingPlayer = (dx > 0 && botFighter.facing === 1) || (dx < 0 && botFighter.facing === -1);

    // Don't act if in hitstun or attacking or KO
    if (botFighter.hitStun > 0 || botFighter.attacking || botFighter.isKO) return input;

    // Think every few frames for less robotic behavior
    bot.thinkTimer--;
    if (bot.thinkTimer <= 0) {
        bot.thinkTimer = 8 + Math.floor(Math.random() * 12);
        decideAction(botFighter, player, dist, facingPlayer);
    }

    bot.actionTimer--;

    if (bot.currentAction === 'approach') {
        if (dx > 0) input.right = true;
        else input.left = true;
        // Jump occasionally while approaching
        if (Math.random() < 0.02 && botFighter.grounded) input.jump = true;
    } else if (bot.currentAction === 'retreat') {
        if (dx > 0) input.left = true;
        else input.right = true;
        if (Math.random() < 0.05 && botFighter.grounded) input.jump = true;
    } else if (bot.currentAction === 'attack') {
        // Move toward player if slightly out of range
        if (dist > 70) {
            if (dx > 0) input.right = true;
            else input.left = true;
        }
        if (bot.actionTimer <= 0) {
            if (bot.attackChoice === 'punch') input.punch = true;
            else if (bot.attackChoice === 'kick') input.kick = true;
            else if (bot.attackChoice === 'special') input.special = true;
            bot.currentAction = 'idle';
            bot.actionTimer = 10 + Math.floor(Math.random() * 15);
        }
    } else if (bot.currentAction === 'jump') {
        if (botFighter.grounded) input.jump = true;
        // Air attack
        if (!botFighter.grounded && dist < 100 && Math.random() < 0.3) {
            input.punch = true;
        }
        if (dx > 0) input.right = true;
        else input.left = true;
    } else if (bot.currentAction === 'crouch') {
        input.crouch = true;
    }

    return input;
}

function decideAction(botFighter, player, dist, facingPlayer) {
    const healthRatio = botFighter.health / MAX_HEALTH;
    const playerHealthRatio = player.health / MAX_HEALTH;
    const playerAttacking = player.attacking;

    // React to player attacking — dodge or counter
    if (playerAttacking && dist < 100) {
        const roll = Math.random();
        if (roll < 0.35) {
            bot.currentAction = 'retreat';
            bot.actionTimer = 15;
        } else if (roll < 0.55) {
            bot.currentAction = 'jump';
            bot.actionTimer = 20;
        } else if (roll < 0.7) {
            bot.currentAction = 'crouch';
            bot.actionTimer = 12;
        } else {
            // Counter-attack
            bot.currentAction = 'attack';
            bot.attackChoice = 'punch';
            bot.actionTimer = 3;
        }
        return;
    }

    // Close range — attack
    if (dist < 90) {
        const roll = Math.random();
        if (roll < 0.4) {
            bot.currentAction = 'attack';
            bot.attackChoice = 'punch';
            bot.actionTimer = 2 + Math.floor(Math.random() * 5);
        } else if (roll < 0.65) {
            bot.currentAction = 'attack';
            bot.attackChoice = 'kick';
            bot.actionTimer = 3 + Math.floor(Math.random() * 6);
        } else if (roll < 0.8 && botFighter.specialCooldown <= 0) {
            bot.currentAction = 'attack';
            bot.attackChoice = 'special';
            bot.actionTimer = 2;
        } else {
            bot.currentAction = 'retreat';
            bot.actionTimer = 15 + Math.floor(Math.random() * 10);
        }
        return;
    }

    // Mid range — approach or position
    if (dist < 250) {
        const roll = Math.random();
        if (roll < 0.55) {
            bot.currentAction = 'approach';
            bot.actionTimer = 15 + Math.floor(Math.random() * 20);
        } else if (roll < 0.75) {
            bot.currentAction = 'jump';
            bot.actionTimer = 20;
        } else {
            bot.currentAction = 'idle';
            bot.actionTimer = 10 + Math.floor(Math.random() * 15);
        }
        return;
    }

    // Far range — close in
    bot.currentAction = 'approach';
    bot.actionTimer = 20 + Math.floor(Math.random() * 20);

    // Low health → more aggressive with special if available
    if (healthRatio < 0.3 && botFighter.specialCooldown <= 0 && dist < 150) {
        bot.currentAction = 'attack';
        bot.attackChoice = 'special';
        bot.actionTimer = 2;
    }
}

// ============================================================
// FIGHTER UPDATE
// ============================================================

function updateFighter(fighter, input, opponent) {
    const f = state.fight;

    // Decrease timers
    if (fighter.hitStun > 0) fighter.hitStun--;
    if (fighter.hitFlash > 0) fighter.hitFlash--;
    if (fighter.specialCooldown > 0) fighter.specialCooldown--;
    if (fighter.comboTimer > 0) {
        fighter.comboTimer--;
        if (fighter.comboTimer <= 0) fighter.combo = 0;
    }

    // KO animation
    if (fighter.isKO) {
        fighter.koAnimation++;
        fighter.y += 2;
        fighter.vx *= 0.9;
        fighter.x += fighter.vx;
        return;
    }

    // Health display smooth
    if (fighter.displayHealth > fighter.health) {
        fighter.displayHealth = Math.max(fighter.health, fighter.displayHealth - 1.5);
    }
    if (fighter.ghostHealth > fighter.health) {
        fighter.ghostHealth = Math.max(fighter.health, fighter.ghostHealth - 0.4);
    }

    // In hitstun — can't act
    if (fighter.hitStun > 0) {
        fighter.vx *= 0.85;
        fighter.x += fighter.vx;
        applyGravity(fighter);
        clampPosition(fighter, f);
        return;
    }

    // Attack animation
    if (fighter.attacking) {
        fighter.attackFrame++;
        // Check hit at the right frame
        if (!fighter.attackHit && fighter.attackFrame >= fighter.attackDuration * 0.4 && fighter.attackFrame <= fighter.attackDuration * 0.7) {
            checkAttackHit(fighter, opponent);
        }
        if (fighter.attackFrame >= fighter.attackDuration) {
            fighter.attacking = false;
            fighter.attackType = null;
            fighter.attackFrame = 0;
            fighter.attackHit = false;
        }
        fighter.vx *= 0.85;
        fighter.x += fighter.vx;
        applyGravity(fighter);
        clampPosition(fighter, f);
        return;
    }

    // Facing
    if (fighter.x < opponent.x) fighter.facing = 1;
    else fighter.facing = -1;

    // Movement
    fighter.vx = 0;
    fighter.crouching = false;

    if (input.left) fighter.vx = -MOVE_SPEED;
    if (input.right) fighter.vx = MOVE_SPEED;
    if (input.crouch && fighter.grounded) {
        fighter.crouching = true;
        fighter.vx *= 0.3;
    }
    if (input.jump && fighter.grounded) {
        fighter.vy = JUMP_FORCE;
        fighter.grounded = false;
    }

    // Attacks
    if (input.punch && !fighter.attacking) {
        fighter.attacking = true;
        fighter.attackType = 'punch';
        fighter.attackDuration = LIGHT_DURATION;
        fighter.attackFrame = 0;
        fighter.attackHit = false;
    } else if (input.kick && !fighter.attacking) {
        fighter.attacking = true;
        fighter.attackType = 'kick';
        fighter.attackDuration = HEAVY_DURATION;
        fighter.attackFrame = 0;
        fighter.attackHit = false;
    } else if (input.special && !fighter.attacking && fighter.specialCooldown <= 0) {
        fighter.attacking = true;
        fighter.attackType = 'special';
        fighter.attackDuration = SPECIAL_DURATION;
        fighter.attackFrame = 0;
        fighter.attackHit = false;
        fighter.specialCooldown = SPECIAL_COOLDOWN;
    }

    fighter.x += fighter.vx;
    applyGravity(fighter);

    // Body collision with opponent
    const pushDist = fighter.width * 0.8;
    const dx = fighter.x - opponent.x;
    if (Math.abs(dx) < pushDist && !opponent.isKO) {
        const overlap = pushDist - Math.abs(dx);
        if (dx > 0) {
            fighter.x += overlap / 2;
            opponent.x -= overlap / 2;
        } else {
            fighter.x -= overlap / 2;
            opponent.x += overlap / 2;
        }
    }

    clampPosition(fighter, f);
}

function applyGravity(fighter) {
    fighter.vy += GRAVITY;
    fighter.y += fighter.vy;
    if (fighter.y >= fighter.groundY) {
        fighter.y = fighter.groundY;
        fighter.vy = 0;
        fighter.grounded = true;
    } else {
        fighter.grounded = false;
    }
}

function clampPosition(fighter, f) {
    if (fighter.x < fighter.width / 2 + 10) fighter.x = fighter.width / 2 + 10;
    if (fighter.x > f.canvasW - fighter.width / 2 - 10) fighter.x = f.canvasW - fighter.width / 2 - 10;
}

function checkAttackHit(attacker, defender) {
    if (defender.isKO) return;

    // Attack reach
    const reach = attacker.attackType === 'special' ? 90 : attacker.attackType === 'kick' ? 75 : 60;
    const attackX = attacker.x + attacker.facing * reach * 0.5;
    const attackY = attacker.y - FIGHTER_H * 0.5;

    const defCenterX = defender.x;
    const defCenterY = defender.y - (defender.crouching ? FIGHTER_H * 0.3 : FIGHTER_H * 0.5);
    const defW = defender.width * 0.8;
    const defH = defender.crouching ? FIGHTER_H * 0.6 : FIGHTER_H;

    const dx = Math.abs(attackX - defCenterX);
    const dy = Math.abs(attackY - defCenterY);

    if (dx < (reach * 0.5 + defW * 0.5) && dy < defH * 0.6) {
        // Hit!
        attacker.attackHit = true;
        let damage, knockback, soundType;

        if (attacker.attackType === 'punch') {
            damage = LIGHT_DAMAGE;
            knockback = KNOCKBACK_LIGHT;
            soundType = 'punch';
        } else if (attacker.attackType === 'kick') {
            damage = HEAVY_DAMAGE;
            knockback = KNOCKBACK_HEAVY;
            soundType = 'kick';
        } else {
            damage = SPECIAL_DAMAGE;
            knockback = KNOCKBACK_SPECIAL;
            soundType = 'special';
        }

        // Combo bonus
        attacker.combo++;
        attacker.comboTimer = COMBO_WINDOW;
        if (attacker.combo > 1) {
            damage = Math.floor(damage * (1 + (attacker.combo - 1) * 0.1));
            playSound('combo');
        }
        if (attacker.combo > attacker.maxCombo) attacker.maxCombo = attacker.combo;

        defender.health -= damage;
        attacker.totalDamage += damage;
        if (defender.health < 0) defender.health = 0;

        defender.hitStun = HIT_STUN;
        defender.hitFlash = 10;
        defender.vx = attacker.facing * knockback;
        defender.vy = -3;

        playSound(soundType);

        // Particles
        const particleX = (attacker.x + defender.x) / 2;
        const particleY = attacker.y - FIGHTER_H * 0.5;
        const pCount = attacker.attackType === 'special' ? 15 : attacker.attackType === 'kick' ? 10 : 6;
        spawnHitParticles(particleX, particleY, pCount, attacker.attackType === 'special' ? '#ffd600' : '#ffffff');

        // Screen shake
        if (attacker.attackType === 'punch') {
            screenShake(5);
        } else if (attacker.attackType === 'kick') {
            screenShake(10);
        } else {
            screenShake(18);
        }

        // Update combo display
        updateComboDisplay(attacker);
    }
}

function updateComboDisplay(fighter) {
    const elId = fighter.player === 1 ? 'combo-p1' : 'combo-p2';
    const el = document.getElementById(elId);
    if (fighter.combo >= 2) {
        let text = fighter.combo + ' COUPS !';
        if (fighter.combo >= 5) text = fighter.combo + ' COUPS !\nBRUTAL !';
        el.textContent = text;
        el.classList.remove('active');
        void el.offsetWidth;
        el.classList.add('active');
    } else {
        el.classList.remove('active');
    }
}

// ============================================================
// RENDERING
// ============================================================

function drawFighter(ctx, fighter) {
    const f = state.fight;
    ctx.save();
    const x = fighter.x + f.shakeX;
    let y = fighter.y + f.shakeY;

    // KO state
    if (fighter.isKO) {
        ctx.globalAlpha = Math.max(0.3, 1 - fighter.koAnimation / 60);
        const koOffset = Math.min(fighter.koAnimation * 3, 80);
        ctx.translate(x, y);
        ctx.rotate((fighter.facing === 1 ? 1 : -1) * Math.min(fighter.koAnimation * 0.05, Math.PI / 2));
        ctx.translate(-x, -y);
        y += koOffset * 0.3;
    }

    // Hit flash
    if (fighter.hitFlash > 0 && fighter.hitFlash % 2 === 0) {
        ctx.globalAlpha = 0.6;
    }

    const headY = y - FIGHTER_H - HEAD_RADIUS * 0.5;
    const bodyTop = y - FIGHTER_H + HEAD_RADIUS;
    const bodyBottom = fighter.crouching ? y - FIGHTER_H * 0.3 : y;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, fighter.groundY + 2, 25, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (simple geometric)
    const bodyColor = fighter.color;
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Torso
    ctx.beginPath();
    ctx.moveTo(x, bodyTop + 5);
    ctx.lineTo(x, bodyBottom - 25);
    ctx.stroke();

    // Legs
    const legSpread = fighter.crouching ? 18 : 12;
    const legBend = fighter.crouching ? -8 : 0;
    ctx.beginPath();
    ctx.moveTo(x, bodyBottom - 25);
    ctx.lineTo(x - legSpread, bodyBottom + legBend);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, bodyBottom - 25);
    ctx.lineTo(x + legSpread, bodyBottom + legBend);
    ctx.stroke();

    // Arms
    let armAngle = 0;
    let armExtend = 20;
    if (fighter.attacking) {
        const progress = fighter.attackFrame / fighter.attackDuration;
        if (fighter.attackType === 'punch') {
            if (progress < 0.5) {
                armExtend = 20 + progress * 60;
            } else {
                armExtend = 50 - (progress - 0.5) * 60;
            }
        } else if (fighter.attackType === 'kick') {
            armExtend = 15;
        } else if (fighter.attackType === 'special') {
            if (progress < 0.5) {
                armExtend = 20 + progress * 80;
                armAngle = -0.3;
            } else {
                armExtend = 60 - (progress - 0.5) * 80;
            }
        }
    }

    // Attack arm
    const armY = bodyTop + 15;
    ctx.beginPath();
    ctx.moveTo(x, armY);
    ctx.lineTo(x + fighter.facing * armExtend, armY + armAngle * 20);
    ctx.stroke();

    // Back arm (idle)
    ctx.beginPath();
    ctx.moveTo(x, armY);
    ctx.lineTo(x - fighter.facing * 15, armY + 10);
    ctx.stroke();

    // Kick leg
    if (fighter.attacking && (fighter.attackType === 'kick' || fighter.attackType === 'special')) {
        const progress = fighter.attackFrame / fighter.attackDuration;
        let kickExtend = 0;
        if (progress < 0.5) {
            kickExtend = progress * 70;
        } else {
            kickExtend = 35 - (progress - 0.5) * 70;
        }
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, bodyBottom - 25);
        ctx.lineTo(x + fighter.facing * kickExtend, bodyBottom - 30 + legBend);
        ctx.stroke();
        ctx.lineWidth = 4;
    }

    // Special glow
    if (fighter.attacking && fighter.attackType === 'special') {
        const progress = fighter.attackFrame / fighter.attackDuration;
        ctx.save();
        ctx.globalAlpha = 0.4 * (1 - progress);
        ctx.fillStyle = '#ffd600';
        ctx.beginPath();
        const glowX = x + fighter.facing * armExtend;
        ctx.arc(glowX, armY, 15 + progress * 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Head (photo)
    const img = fighterImages[fighter.name];
    if (img && img.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, headY, HEAD_RADIUS, 0, Math.PI * 2);
        ctx.clip();

        if (fighter.facing === -1) {
            ctx.translate(x, headY);
            ctx.scale(-1, 1);
            ctx.drawImage(img, -HEAD_RADIUS, -HEAD_RADIUS, HEAD_RADIUS * 2, HEAD_RADIUS * 2);
        } else {
            ctx.drawImage(img, x - HEAD_RADIUS, headY - HEAD_RADIUS, HEAD_RADIUS * 2, HEAD_RADIUS * 2);
        }
        ctx.restore();

        // Head border
        ctx.strokeStyle = fighter.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, headY, HEAD_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        // Fallback circle
        ctx.fillStyle = fighter.color;
        ctx.beginPath();
        ctx.arc(x, headY, HEAD_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawBackground(ctx) {
    const f = state.fight;
    const w = f.canvasW;
    const h = f.canvasH;

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#05051a');
    grad.addColorStop(0.6, '#0a0a2e');
    grad.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Parallax stars
    const midX = (f.p1.x + f.p2.x) / 2;
    const offset = (midX - w / 2) * 0.02;

    f.bgStars.forEach(star => {
        const px = star.layer === 0 ? offset * 0.5 : offset;
        ctx.fillStyle = 'rgba(255,255,255,' + star.brightness + ')';
        ctx.beginPath();
        ctx.arc(star.x - px, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Distant city silhouette (layer 1)
    ctx.fillStyle = '#0d0d28';
    const cityY = h * GROUND_Y - 30;
    for (let bx = 0; bx < w; bx += 60) {
        const bh = 30 + Math.sin(bx * 0.05) * 30 + Math.cos(bx * 0.03) * 20;
        ctx.fillRect(bx - offset * 0.3, cityY - bh, 50, bh + 40);
    }

    // Near buildings (layer 2)
    ctx.fillStyle = '#111138';
    for (let bx = 20; bx < w; bx += 90) {
        const bh = 40 + Math.sin(bx * 0.07 + 1) * 35 + Math.cos(bx * 0.02) * 25;
        ctx.fillRect(bx - offset * 0.6, cityY - bh + 10, 70, bh + 30);
        // windows
        ctx.fillStyle = 'rgba(255, 214, 0, 0.15)';
        for (let wy = cityY - bh + 20; wy < cityY + 10; wy += 15) {
            for (let wx = bx - offset * 0.6 + 8; wx < bx - offset * 0.6 + 62; wx += 18) {
                if (Math.random() > 0.3) {
                    ctx.fillRect(wx, wy, 8, 8);
                }
            }
        }
        ctx.fillStyle = '#111138';
    }

    // Ground
    const groundY = h * GROUND_Y;
    ctx.fillStyle = '#1a1a3e';
    ctx.fillRect(0, groundY, w, h - groundY);

    // Ground line glow
    ctx.strokeStyle = '#ff2d5540';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    ctx.strokeStyle = '#00d4ff30';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 1);
    ctx.lineTo(w, groundY + 1);
    ctx.stroke();

    // Ground grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, groundY);
        ctx.lineTo(gx, h);
        ctx.stroke();
    }
    for (let gy = groundY; gy < h; gy += 20) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
    }
}

function drawParticles(ctx) {
    const f = state.fight;
    f.particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x + f.shakeX, p.y + f.shakeY, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// ============================================================
// GAME LOOP
// ============================================================

let lastFrameTime = 0;
let animFrameId = null;

function gameLoop(timestamp) {
    animFrameId = requestAnimationFrame(gameLoop);

    if (state.screen !== 'fight' || !state.fight) return;
    if (state.paused) return;

    const f = state.fight;
    const canvas = document.getElementById('arena-canvas');
    const ctx = canvas.getContext('2d');

    // Slow-mo
    if (f.slowmo > 0) {
        f.slowmo--;
        if (f.slowmo % 3 !== 0) return; // skip frames for slow-mo
    }

    // Decay shake
    f.shakeX *= 0.8;
    f.shakeY *= 0.8;

    // Update phase
    if (f.phase === 'fighting') {
        const p1Input = getP1Input();
        // Clear one-shot touch attacks after reading
        touchState.punch = false;
        touchState.kick = false;
        touchState.special = false;
        const botInput = getBotInput(f.p2, f.p1);

        updateFighter(f.p1, p1Input, f.p2);
        updateFighter(f.p2, botInput, f.p1);
        updateParticles();

        // Timer
        f.timer--;
        if (f.timer <= 0) f.timer = 0;

        // Check KO
        if (f.p1.health <= 0 && !f.p1.isKO) {
            f.p1.isKO = true;
            f.phase = 'ko';
            playSound('ko');
            showAnnouncement('K.O. !', 2000);
            screenShake(25);
            f.slowmo = 30;
            spawnHitParticles(f.p1.x, f.p1.y - FIGHTER_H / 2, 25, '#ff2d55');
            setTimeout(() => endRound(2), 2500);
        } else if (f.p2.health <= 0 && !f.p2.isKO) {
            f.p2.isKO = true;
            f.phase = 'ko';
            playSound('ko');
            showAnnouncement('K.O. !', 2000);
            screenShake(25);
            f.slowmo = 30;
            spawnHitParticles(f.p2.x, f.p2.y - FIGHTER_H / 2, 25, '#00d4ff');
            setTimeout(() => endRound(1), 2500);
        }

        // Time out
        if (f.timer <= 0 && f.phase === 'fighting') {
            f.phase = 'ko';
            if (f.p1.health > f.p2.health) {
                showAnnouncement('TEMPS ! TU GAGNES', 2000);
                setTimeout(() => endRound(1), 2500);
            } else if (f.p2.health > f.p1.health) {
                showAnnouncement('TEMPS ! LE BOT GAGNE', 2000);
                setTimeout(() => endRound(2), 2500);
            } else {
                showAnnouncement('EGALITE !', 2000);
                setTimeout(() => endRound(0), 2500);
            }
        }
    } else if (f.phase === 'ko') {
        updateFighter(f.p1, {}, f.p2);
        updateFighter(f.p2, {}, f.p1);
        updateParticles();
    }

    // Combo display hide
    if (f.p1.combo === 0) document.getElementById('combo-p1').classList.remove('active');
    if (f.p2.combo === 0) document.getElementById('combo-p2').classList.remove('active');

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx);
    drawFighter(ctx, f.p1);
    drawFighter(ctx, f.p2);
    drawParticles(ctx);

    updateHealthBars();
}

function endRound(winner) {
    const f = state.fight;
    if (!f || f.phase === 'matchEnd') return;

    // Store stats
    state.matchStats.p1Damage += f.p1.totalDamage;
    state.matchStats.p2Damage += f.p2.totalDamage;
    if (f.p1.maxCombo > state.matchStats.p1MaxCombo) state.matchStats.p1MaxCombo = f.p1.maxCombo;
    if (f.p2.maxCombo > state.matchStats.p2MaxCombo) state.matchStats.p2MaxCombo = f.p2.maxCombo;

    if (winner === 1) f.p1Rounds++;
    else if (winner === 2) f.p2Rounds++;

    updateHUD();

    // Check match end
    if (f.p1Rounds >= 2) {
        f.phase = 'matchEnd';
        setTimeout(() => showVictory(1), 1000);
        return;
    }
    if (f.p2Rounds >= 2) {
        f.phase = 'matchEnd';
        setTimeout(() => showVictory(2), 1000);
        return;
    }

    // Next round
    f.round++;
    f.phase = 'roundEnd';

    setTimeout(() => {
        // Reset fighters
        f.p1.health = MAX_HEALTH;
        f.p1.displayHealth = MAX_HEALTH;
        f.p1.ghostHealth = MAX_HEALTH;
        f.p1.isKO = false;
        f.p1.koAnimation = 0;
        f.p1.x = f.canvasW * 0.25;
        f.p1.y = f.p1.groundY;
        f.p1.vx = 0;
        f.p1.vy = 0;
        f.p1.hitStun = 0;
        f.p1.attacking = false;
        f.p1.combo = 0;
        f.p1.totalDamage = 0;
        f.p1.specialCooldown = 0;

        f.p2.health = MAX_HEALTH;
        f.p2.displayHealth = MAX_HEALTH;
        f.p2.ghostHealth = MAX_HEALTH;
        f.p2.isKO = false;
        f.p2.koAnimation = 0;
        f.p2.x = f.canvasW * 0.75;
        f.p2.y = f.p2.groundY;
        f.p2.vx = 0;
        f.p2.vy = 0;
        f.p2.hitStun = 0;
        f.p2.attacking = false;
        f.p2.combo = 0;
        f.p2.totalDamage = 0;
        f.p2.specialCooldown = 0;

        f.timer = ROUND_TIME * 60;
        f.particles = [];

        bot.thinkTimer = 0;
        bot.currentAction = null;
        bot.actionTimer = 0;
        bot.attackChoice = null;

        startCountdown();
    }, 1500);
}

// ============================================================
// VICTORY SCREEN
// ============================================================

function showVictory(winnerNum) {
    const f = state.fight;
    const winner = winnerNum === 1 ? f.p1 : f.p2;
    const loser = winnerNum === 1 ? f.p2 : f.p1;

    showScreen('victory');

    document.getElementById('winner-avatar').src = 'players/' + winner.name + '.png';
    document.getElementById('winner-name').textContent = winner.name.toUpperCase();

    const statsEl = document.getElementById('match-stats');
    statsEl.innerHTML =
        '<div><span class="stat-label">DEGATS INFLIGES</span></div>' +
        '<div><span class="stat-p1">' + winner.name.toUpperCase() + ': ' + state.matchStats['p' + winnerNum + 'Damage'] + '</span></div>' +
        '<div><span class="stat-p2">' + loser.name.toUpperCase() + ': ' + state.matchStats['p' + (winnerNum === 1 ? 2 : 1) + 'Damage'] + '</span></div>' +
        '<div style="margin-top:8px"><span class="stat-label">PLUS LONG COMBO</span></div>' +
        '<div><span class="stat-p1">' + winner.name.toUpperCase() + ': ' + state.matchStats['p' + winnerNum + 'MaxCombo'] + ' coups</span></div>' +
        '<div><span class="stat-p2">' + loser.name.toUpperCase() + ': ' + state.matchStats['p' + (winnerNum === 1 ? 2 : 1) + 'MaxCombo'] + ' coups</span></div>' +
        '<div style="margin-top:8px"><span class="stat-label">ROUNDS GAGNES</span></div>' +
        '<div><span class="stat-p1">' + winner.name.toUpperCase() + ': ' + f['p' + winnerNum + 'Rounds'] + '</span></div>' +
        '<div><span class="stat-p2">' + loser.name.toUpperCase() + ': ' + f['p' + (winnerNum === 1 ? 2 : 1) + 'Rounds'] + '</span></div>';

    startConfetti();
}

// ============================================================
// CONFETTI
// ============================================================

let confettiParticles = [];
let confettiAnimId = null;

function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    confettiParticles = [];
    const colors = ['#ff2d55', '#00d4ff', '#ffd600', '#ff6b6b', '#4ecdc4', '#ffffff'];

    for (let i = 0; i < 150; i++) {
        confettiParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: 6 + Math.random() * 6,
            h: 4 + Math.random() * 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 3,
            vy: 2 + Math.random() * 4,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.2
        });
    }

    function animateConfetti() {
        confettiAnimId = requestAnimationFrame(animateConfetti);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        confettiParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.rotSpeed;
            if (p.y > canvas.height + 20) {
                p.y = -20;
                p.x = Math.random() * canvas.width;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
    }

    animateConfetti();
}

function stopConfetti() {
    if (confettiAnimId) {
        cancelAnimationFrame(confettiAnimId);
        confettiAnimId = null;
    }
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// ============================================================
// WINDOW RESIZE
// ============================================================

function handleResize() {
    if (state.fight) {
        const canvas = document.getElementById('arena-canvas');
        const oldW = state.fight.canvasW;
        const oldH = state.fight.canvasH;
        const newW = window.innerWidth;
        const newH = window.innerHeight;

        canvas.width = newW;
        canvas.height = newH;

        // Scale fighter positions
        const scaleX = newW / oldW;
        const scaleY = newH / oldH;
        state.fight.p1.x *= scaleX;
        state.fight.p1.groundY = newH * GROUND_Y;
        state.fight.p1.y = Math.min(state.fight.p1.y * scaleY, state.fight.p1.groundY);
        state.fight.p2.x *= scaleX;
        state.fight.p2.groundY = newH * GROUND_Y;
        state.fight.p2.y = Math.min(state.fight.p2.y * scaleY, state.fight.p2.groundY);

        state.fight.canvasW = newW;
        state.fight.canvasH = newH;

        // Regenerate stars
        state.fight.bgStars = [];
        for (let i = 0; i < 80; i++) {
            state.fight.bgStars.push({
                x: Math.random() * newW,
                y: Math.random() * newH * 0.7,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.5 + 0.2,
                layer: Math.random() < 0.5 ? 0 : 1
            });
        }
    }

    if (state.screen === 'victory') {
        const confettiCanvas = document.getElementById('confetti-canvas');
        if (confettiCanvas) {
            confettiCanvas.width = window.innerWidth;
            confettiCanvas.height = window.innerHeight;
        }
    }
}

// ============================================================
// INIT
// ============================================================

function init() {
    preloadImages();
    buildRoster();
    updateSelectUI();

    // Roster clicks
    document.getElementById('roster-grid').addEventListener('click', handleRosterClick);

    // Fight button
    document.getElementById('btn-fight').addEventListener('click', function() {
        if (state.p1Fighter && state.p2Fighter) {
            startFight();
        }
    });

    // Keyboard
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Pause buttons
    document.getElementById('btn-resume').addEventListener('click', function() {
        togglePause();
    });

    document.getElementById('btn-quit').addEventListener('click', function() {
        state.paused = false;
        document.getElementById('screen-pause').classList.remove('active');
        state.fight = null;
        resetSelect();
        showScreen('select');
    });

    // Sound toggle
    document.getElementById('btn-sound').addEventListener('click', function() {
        state.soundEnabled = !state.soundEnabled;
        this.textContent = state.soundEnabled ? '🔊' : '🔇';
        if (state.soundEnabled) {
            getAudioCtx(); // Initialize on user interaction
        }
    });

    // Rematch
    document.getElementById('btn-rematch').addEventListener('click', function() {
        stopConfetti();
        state.fight = null;
        resetSelect();
        showScreen('select');
    });

    // Touch controls
    document.querySelectorAll('.dpad-btn').forEach(function(btn) {
        var dir = btn.dataset.dir;
        btn.addEventListener('touchstart', function(e) { e.preventDefault(); touchState[dir] = true; btn.classList.add('pressed'); }, { passive: false });
        btn.addEventListener('touchend', function(e) { e.preventDefault(); touchState[dir] = false; btn.classList.remove('pressed'); }, { passive: false });
        btn.addEventListener('touchcancel', function() { touchState[dir] = false; btn.classList.remove('pressed'); });
    });
    document.querySelectorAll('.attack-btn').forEach(function(btn) {
        var attack = btn.dataset.attack;
        btn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            touchState[attack] = true;
            btn.classList.add('pressed');
        }, { passive: false });
        btn.addEventListener('touchend', function(e) {
            e.preventDefault();
            touchState[attack] = false;
            btn.classList.remove('pressed');
        }, { passive: false });
        btn.addEventListener('touchcancel', function() { touchState[attack] = false; btn.classList.remove('pressed'); });
    });

    // Resize
    window.addEventListener('resize', handleResize);

    // Start game loop
    animFrameId = requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', init);
