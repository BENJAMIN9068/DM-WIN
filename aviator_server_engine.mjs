import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

export class AviatorServerEngine {
  constructor(getUsersFn, saveUsersFn, getCurrentUserNumberFn) {
    this.getUsers = getUsersFn;
    this.saveUsers = saveUsersFn;
    this.getCurrentUserNumber = getCurrentUserNumberFn;

    this.currentRoundId = 158500;
    this.currentStage = 1; // 1 = Bet, 2 = Run, 3 = End
    this.currentMultiplier = 1.00;
    this.targetCrashMultiplier = 2.45;
    this.betStateEndTime = Date.now() + 5000;
    this.runStartTime = 0;
    this.onlinePlayers = 1428;
    this.clients = new Set();
    this.loopTimer = null;
    this.tickTimer = null;

    // Map: userId -> Map(betId -> { betId, bet, cashedOut, roundId, userId, userName })
    this.userBets = new Map();

    this.roundData = {
      serverSeed: "d8e8fca2dc0f896fd7cb4cb0031ba249",
      clientSeed: "spribe_client_seed_42",
      hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    };

    this.recentRoundsHistory = [
      { maxMultiplier: 1.84, roundId: 158499 },
      { maxMultiplier: 3.12, roundId: 158498 },
      { maxMultiplier: 1.15, roundId: 158497 },
      { maxMultiplier: 8.45, roundId: 158496 },
      { maxMultiplier: 1.04, roundId: 158495 },
      { maxMultiplier: 2.50, roundId: 158494 },
      { maxMultiplier: 1.42, roundId: 158493 },
      { maxMultiplier: 14.80, roundId: 158492 },
      { maxMultiplier: 1.95, roundId: 158491 },
      { maxMultiplier: 1.02, roundId: 158490 },
      { maxMultiplier: 4.10, roundId: 158489 },
      { maxMultiplier: 2.20, roundId: 158488 },
      { maxMultiplier: 1.25, roundId: 158487 },
      { maxMultiplier: 1.08, roundId: 158486 },
      { maxMultiplier: 5.60, roundId: 158485 },
      { maxMultiplier: 2.05, roundId: 158484 }
    ];

    this.botNames = [
      "Alex_77", "NeoMatrix", "CryptoKing", "LuckyStrike", "SkyHigh",
      "Viper99", "FastMoney", "AviatorPro", "PilotX", "RedAce",
      "Falcon007", "TurboJet", "RocketMan", "AlphaBet", "BigWin99",
      "Jackpot88", "Thunder", "Shadow", "GoldDigger", "StarLord"
    ];

    this.simulatedBets = [];

    // Start centralized game loop
    this.startBetStage();
  }

  getAdminStatus() {
    const now = Date.now();
    const isBetting = this.currentStage === 1;
    const secondsLeft = isBetting ? Math.max(0, Math.ceil((this.betStateEndTime - now) / 1000)) : 0;
    return {
      roundId: this.currentRoundId,
      stage: this.currentStage,
      stageName: isBetting ? 'Pre-Round Betting (6s Window)' : (this.currentStage === 2 ? 'In Flight' : 'Crashed'),
      secondsLeft,
      locked: true,
      targetCrashMultiplier: this.targetCrashMultiplier,
      currentMultiplier: this.currentMultiplier,
      recentHistory: this.recentRoundsHistory.slice(0, 5).map(r => `${r.maxMultiplier}x`)
    };
  }

  generateProvablyFairRound() {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const clientSeed = "spribe_client_seed_" + this.currentRoundId;
    const hash = crypto.createHmac('sha256', serverSeed).update(clientSeed).digest('hex');

    const r = Math.random();
    let multiplier;
    if (r < 0.10) {
      multiplier = +(1.00 + Math.random() * 0.18).toFixed(2);
    } else if (r < 0.42) {
      multiplier = +(1.20 + Math.random() * 0.80).toFixed(2);
    } else if (r < 0.72) {
      multiplier = +(2.01 + Math.random() * 2.50).toFixed(2);
    } else if (r < 0.88) {
      multiplier = +(4.51 + Math.random() * 5.50).toFixed(2);
    } else if (r < 0.96) {
      multiplier = +(10.01 + Math.random() * 25.00).toFixed(2);
    } else {
      multiplier = +(35.01 + Math.random() * 65.00).toFixed(2);
    }

    return {
      serverSeed,
      clientSeed,
      hash,
      multiplier: +multiplier.toFixed(2)
    };
  }

  generateSimulatedBets() {
    const bets = [];
    const count = 15 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const name = this.botNames[i % this.botNames.length];
      const betAmount = [10, 20, 50, 100, 200, 500, 1000][Math.floor(Math.random() * 7)];
      bets.push({
        player_id: "bot_" + (1000 + i),
        username: name,
        bet: betAmount,
        profileImage: (i % 20) + ".png",
        cashedOut: false
      });
    }
    return bets;
  }

  broadcast(cmd, params) {
    if (params && params.code === undefined) params.code = 200;
    const message = JSON.stringify({
      type: "extensionResponse",
      cmd: cmd,
      params: params
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(message); } catch (e) {}
      }
    }
  }

  sendTo(client, cmd, params) {
    if (client.readyState !== WebSocket.OPEN) return;
    if (params && params.code === undefined) params.code = 200;
    try {
      client.send(JSON.stringify({
        type: "extensionResponse",
        cmd: cmd,
        params: params
      }));
    } catch (e) {}
  }

  startBetStage() {
    this.currentStage = 1;
    this.currentMultiplier = 1.00;
    this.roundData = this.generateProvablyFairRound();
    this.targetCrashMultiplier = this.roundData.multiplier;
    this.betStateStartTime = Date.now();
    this.betStateEndTime = Date.now() + 6000; // Exact 6 seconds countdown before takeoff!
    this.simulatedBets = this.generateSimulatedBets();
    this.userBets.clear();

    for (const client of this.clients) {
      client.activeBets = {};
    }

    console.log(`[Aviator Server] Round #${this.currentRoundId} starting BET stage (6s lock). Target: ${this.targetCrashMultiplier}x`);

    this.broadcast("changeState", {
      code: 200,
      newStateId: 1,
      roundId: this.currentRoundId,
      betStateEndTime: this.betStateEndTime,
      serverTime: Date.now()
    });

    this.broadcast("updateCurrentBets", {
      code: 200,
      betsCount: this.simulatedBets.length,
      bets: this.simulatedBets
    });

    if (this.loopTimer) clearTimeout(this.loopTimer);
    this.loopTimer = setTimeout(() => {
      this.startRunStage();
    }, 6000);
  }

  startRunStage() {
    this.currentStage = 2;
    this.currentMultiplier = 1.00;
    this.runStartTime = Date.now();

    console.log(`[Aviator Server] Round #${this.currentRoundId} plane RUN stage started. Crash target: ${this.targetCrashMultiplier}x`);

    this.broadcast("changeState", {
      code: 200,
      newStateId: 2,
      roundId: this.currentRoundId,
      serverTime: Date.now()
    });

    this.broadcast("x", {
      code: 200,
      x: 1.00
    });

    const tickInterval = 50;

    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => {
      if (this.currentStage !== 2) {
        clearInterval(this.tickTimer);
        return;
      }

      const elapsed = (Date.now() - this.runStartTime) / 1000;
      let nextM = Math.pow(Math.E, 0.070 * elapsed + (elapsed > 10 ? 0.02 * (elapsed - 10) : 0));
      nextM = Math.max(1.00, +(nextM.toFixed(2)));

      this.currentMultiplier = nextM;

      if (this.currentMultiplier >= this.targetCrashMultiplier) {
        clearInterval(this.tickTimer);
        this.startEndStage();
        return;
      }

      // Synchronized multiplier tick broadcast to ALL devices
      this.broadcast("x", {
        code: 200,
        x: this.currentMultiplier
      });

      // Bot cashouts simulation
      if (Math.random() < 0.22 && this.simulatedBets.length > 0) {
        const randomIdx = Math.floor(Math.random() * this.simulatedBets.length);
        const b = this.simulatedBets[randomIdx];
        if (b && !b.cashedOut) {
          b.cashedOut = true;
          this.broadcast("updateCurrentCashOuts", {
            code: 200,
            cashouts: [{
              player_id: b.player_id,
              username: b.username,
              bet: b.bet,
              multiplier: this.currentMultiplier,
              winAmount: +(b.bet * this.currentMultiplier).toFixed(2)
            }]
          });
        }
      }
    }, tickInterval);
  }

  startEndStage() {
    this.currentStage = 3;
    const finalCrash = this.targetCrashMultiplier;

    console.log(`[Aviator Server] Round #${this.currentRoundId} CRASHED at ${finalCrash}x!`);

    this.broadcast("x", {
      code: 200,
      crashX: finalCrash,
      x: finalCrash
    });

    this.broadcast("changeState", {
      code: 200,
      newStateId: 3,
      roundId: this.currentRoundId,
      serverTime: Date.now()
    });

    this.recentRoundsHistory.unshift({
      maxMultiplier: finalCrash,
      roundId: this.currentRoundId
    });
    if (this.recentRoundsHistory.length > 50) {
      this.recentRoundsHistory.pop();
    }

    this.broadcast("roundChartInfo", {
      code: 200,
      maxMultiplier: finalCrash,
      roundId: this.currentRoundId
    });

    // Mark any un-cashed-out active bets as lost
    for (const [uId, betsMap] of this.userBets.entries()) {
      for (const [bId, betObj] of betsMap.entries()) {
        betObj.cashedOut = true;
      }
    }

    if (this.loopTimer) clearTimeout(this.loopTimer);
    this.loopTimer = setTimeout(() => {
      this.currentRoundId++;
      this.startBetStage();
    }, 3500);
  }

  getUser(userId) {
    const users = this.getUsers();
    if (userId && users[userId]) return users[userId];
    const curr = this.getCurrentUserNumber();
    if (curr && users[curr]) return users[curr];
    return  { amount: 1250, nickName: "Player" };
  }

  handleClientMessage(client, rawData) {
    try {
      const data = JSON.parse(rawData);

      // Ping
      if (data.type === 'ping' || (data.extCmd && (data.extCmd.includes('ping') || data.extCmd.includes('PING')))) {
        this.sendTo(client, "PING_RESPONSE", { code: 200 });
        return;
      }

      // Login
      if (data.type === 'login' || data.cmd === 'login') {
        const uId = data.userId || this.getCurrentUserNumber() || '9068839558';
        const userObj = this.getUser(uId);
        client.userId = uId;
        client.userName = data.userName || userObj.nickName || userObj.username || uId;
        client.playerBalance = typeof userObj.amount === 'number' ? userObj.amount : 1250;

        if (!client.activeBets) client.activeBets = {};

        // Check if this user had active bets in current round (e.g. across refresh)
        const userBetsMap = this.userBets.get(uId);
        const restoredActiveBets = [];
        if (userBetsMap) {
          for (const [bId, bObj] of userBetsMap.entries()) {
            if (bObj.roundId === this.currentRoundId && !bObj.cashedOut) {
              client.activeBets[bId] = bObj;
              restoredActiveBets.push({
                betId: bObj.betId,
                bet: bObj.bet,
                cashedOut: bObj.cashedOut,
                roundId: bObj.roundId
              });
            }
          }
        }

        client.send(JSON.stringify({
          type: "login",
          user: { name: client.userName, id: 65480 }
        }));

        // Send full synchronized game state (init) with restored active bets
        this.sendTo(client, "init", {
          code: 200,
          stageId: this.currentStage,
          roundId: this.currentRoundId,
          currentMultiplier: this.currentMultiplier,
          betStateEndTime: this.betStateEndTime,
          serverTime: Date.now(),
          activeBets: restoredActiveBets,
          user: {
            balance: client.playerBalance,
            userId: "65480",
            username: client.userName,
            profileImage: "0.png",
            settings: {
              sound: true,
              music: true,
              animation: true,
              secondBet: true
            }
          },
          onlinePlayers: this.onlinePlayers + this.clients.size * 3,
          roundsInfo: this.recentRoundsHistory,
          config: {
            currency: "INR",
            defaultBetValue: 50.0,
            fullBetTime: 5000,
            inactivityTimeForDisconnect: 0,
            isAutoBetFeatureEnabled: true,
            isBalanceValidationEnabled: false,
            isClockVisible: true,
            isCurrencyNameHidden: false,
            isFreeBetsEnabled: false,
            isHolidayTheme: false,
            isLiveBetsAndStatisticsHidden: false,
            isMultipleBetsEnabled: true,
            isShowActivePlayersWidget: true,
            isShowBetControlNumber: true,
            isShowTotalWinWidget: true,
            isShowWinAmountUntilNextRound: true,
            isUseMaskedUsername: false,
            maxBet: 10000.0,
            maxUserWin: 500000.0,
            minBet: 1.0,
            multiplierPrecision: 2,
            pingIntervalMs: 5000,
            maxGameMultiplier: 10000,
            betPrecision: 2
          }
        });

        // Send current bets list
        this.sendTo(client, "updateCurrentBets", {
          code: 200,
          betsCount: this.simulatedBets.length + (restoredActiveBets.length > 0 ? 1 : 0),
          bets: this.simulatedBets
        });

        // If client joins or refreshes mid-flight (Stage 2), immediately catch them up
        if (this.currentStage === 2) {
          this.sendTo(client, "changeState", {
            code: 200,
            newStateId: 2,
            roundId: this.currentRoundId,
            serverTime: Date.now()
          });
          this.sendTo(client, "x", {
            code: 200,
            x: this.currentMultiplier
          });
        }
        return;
      }

      // Extension Requests
      if (data.type === 'extensionRequest') {
        const extCmd = data.extCmd || '';
        const params = data.params || {};

        if (extCmd === 'betHandler' || extCmd === 'bet') {
          const betId = params.betId || 1;
          const amount = Number(params.bet || 10.0);
          const userObj = this.getUser(client.userId);
          const currentBal = typeof userObj.amount === 'number' ? userObj.amount : 0;

          if (currentBal >= amount) {
            userObj.amount = Math.max(0, +(currentBal - amount).toFixed(2));
            client.playerBalance = userObj.amount;
            this.saveUsers();

            const betObj = {
              betId: betId,
              bet: amount,
              cashedOut: false,
              roundId: this.currentRoundId,
              userId: client.userId,
              userName: client.userName || "Player"
            };

            if (!client.activeBets) client.activeBets = {};
            client.activeBets[betId] = betObj;

            let uMap = this.userBets.get(client.userId);
            if (!uMap) {
              uMap = new Map();
              this.userBets.set(client.userId, uMap);
            }
            uMap.set(betId, betObj);

            console.log(`[Aviator Bet] User ${client.userId} bet ₹${amount} (Panel ${betId}). New balance: ₹${userObj.amount}`);

            this.sendTo(client, "bet", {
              code: 200,
              betId: betId,
              bet: amount,
              player_id: "65480"
            });

            this.sendTo(client, "newBalance", {
              code: 200,
              newBalance: client.playerBalance
            });

            // Broadcast to other devices
            this.broadcast("updateCurrentBets", {
              code: 200,
              betsCount: this.simulatedBets.length + 1,
              bets: [
                {
                  player_id: "65480",
                  username: client.userName || "Player",
                  bet: amount,
                  profileImage: "0.png",
                  cashedOut: false
                }
              ]
            });
          } else {
            this.sendTo(client, "bet", {
              code: 400,
              betId: betId,
              errorMessage: "Insufficient balance"
            });
          }
        } else if (extCmd === 'cashOutHandler' || extCmd === 'cashOut') {
          const betId = params.betId || 1;
          let betObj = client.activeBets ? client.activeBets[betId] : null;
          if (!betObj && this.userBets.get(client.userId)) {
            betObj = this.userBets.get(client.userId).get(betId);
          }

          if (betObj && !betObj.cashedOut && this.currentStage === 2) {
            betObj.cashedOut = true;
            const mult = this.currentMultiplier;
            const winAmount = +(betObj.bet * mult).toFixed(2);

            const userObj = this.getUser(client.userId);
            userObj.amount = +(userObj.amount + winAmount).toFixed(2);
            client.playerBalance = userObj.amount;
            this.saveUsers();

            console.log(`[Aviator Cashout] User ${client.userId} cashed out @ ${mult}x: Win ₹${winAmount}. New balance: ₹${userObj.amount}`);

            this.sendTo(client, "cashOut", {
              code: 200,
              betId: betId,
              multiplier: mult,
              winAmount: winAmount,
              currency: "INR"
            });

            this.sendTo(client, "newBalance", {
              code: 200,
              newBalance: client.playerBalance
            });

            this.broadcast("updateCurrentCashOuts", {
              code: 200,
              cashouts: [
                {
                  player_id: "65480",
                  username: client.userName || "Player",
                  bet: betObj.bet,
                  multiplier: mult,
                  winAmount: winAmount
                }
              ]
            });
          }
        } else if (extCmd === 'cancelHandler' || extCmd === 'cancel') {
          const betId = params.betId || 1;
          let betObj = client.activeBets ? client.activeBets[betId] : null;
          if (!betObj && this.userBets.get(client.userId)) {
            betObj = this.userBets.get(client.userId).get(betId);
          }

          if (betObj && !betObj.cashedOut && this.currentStage === 1) {
            const refund = betObj.bet;
            const userObj = this.getUser(client.userId);
            userObj.amount = +(userObj.amount + refund).toFixed(2);
            client.playerBalance = userObj.amount;
            this.saveUsers();

            if (client.activeBets) delete client.activeBets[betId];
            if (this.userBets.get(client.userId)) {
              this.userBets.get(client.userId).delete(betId);
            }

            console.log(`[Aviator Cancel] User ${client.userId} cancelled bet ₹${refund}. New balance: ₹${userObj.amount}`);

            this.sendTo(client, "cancel", {
              code: 200,
              betId: betId
            });

            this.sendTo(client, "newBalance", {
              code: 200,
              newBalance: client.playerBalance
            });
          }
        } else if (extCmd === 'currentBetsInfoHandler' || extCmd === 'currentBetsInfo') {
          this.sendTo(client, "currentBetsInfo", {
            code: 200,
            bets: this.simulatedBets,
            betsCount: this.simulatedBets.length
          });
        } else if (extCmd === 'previousRoundInfoHandler' || extCmd === 'previousRoundInfo') {
          this.sendTo(client, "previousRoundInfoResponse", {
            code: 200,
            rounds: this.recentRoundsHistory
          });
        } else if (extCmd === 'updateBalanceHandler' || extCmd === 'updateBalance') {
          const userObj = this.getUser(client.userId);
          client.playerBalance = typeof userObj.amount === 'number' ? userObj.amount : 1250;
          this.sendTo(client, "newBalance", {
            code: 200,
            newBalance: client.playerBalance
          });
        } else if (extCmd === 'roundFairnessHandler' || extCmd === 'roundFairness') {
          this.sendTo(client, "roundFairnessResponse", {
            code: 200,
            serverSeed: this.roundData.serverSeed,
            clientSeed: this.roundData.clientSeed,
            combinedHash: this.roundData.hash
          });
        }
      }
    } catch (err) {
      console.error('[Aviator Server Message Error]:', err);
    }
  }
}
