(function(global){
  "use strict";

  function initSimulation(containerId){
    var container = document.getElementById(containerId);

    if(!container){
      throw new Error("Simulation container not found: " + containerId);
    }

    var state = {
      securityScore: 100,
      riskLevel: 0,
      timePressure: 0,
      currentScenario: "vendor_email",
      history: []
    };

    var timers = [];

    var scenarios = {
      vendor_email: {
        type: "email",
        title: "Vendor Email",
        sender: "accounts@northbridge-supplies.com",
        content: "Hi, please note our bank details have changed for all future invoice payments. Please update your records before the next payment run today.",
        detail: "A PDF attachment and a short signature block are included. The tone feels routine, but the timing is urgent.",
        choices: [
          {
            text: "Update details immediately",
            effect: { securityScore: -40, riskLevel: 50, timePressure: 10 },
            next: "follow_up_call"
          },
          {
            text: "Reply and ask them to confirm the change",
            effect: { securityScore: -20, riskLevel: 25, timePressure: 10 },
            next: "follow_up_call"
          },
          {
            text: "Call the vendor using a known contact number",
            effect: { securityScore: 20, riskLevel: -20, timePressure: -5 },
            next: "teams_message"
          }
        ]
      },
      follow_up_call: {
        type: "phone",
        title: "Follow-Up Call",
        caller: "Unknown external number",
        content: "A caller claiming to be from the vendor's finance team says the bank change must be processed before cut-off. They insist the finance director is unavailable and ask you to keep the matter moving.",
        detail: "The call is confident and friendly, but pushes you to act before normal checks are completed.",
        highRiskContent: "The caller references the email you just received and says delays could cause shipment disruption. They push harder, mention senior management pressure, and discourage waiting for written approval.",
        choices: [
          {
            text: "Accept the urgency and process the request",
            effect: { securityScore: -35, riskLevel: 35, timePressure: 20 },
            next: "teams_message"
          },
          {
            text: "Tell the caller you will verify through approved channels",
            effect: { securityScore: 15, riskLevel: -15, timePressure: -5 },
            next: "teams_message"
          },
          {
            text: "Ask them to resend documents and continue the call",
            effect: { securityScore: -10, riskLevel: 15, timePressure: 10 },
            next: "teams_message"
          }
        ]
      },
      teams_message: {
        type: "chat",
        title: "Internal Teams Message",
        sender: "James Wilson (Finance)",
        content: "Hey, sorry to drop this on you. I am locked out of the shared drive and need the latest client payment tracker before a meeting.",
        detail: "A Teams message appears in the middle of your work. The profile looks familiar and the request sounds plausible.",
        highRiskContent: "The message also says the issue is confidential and asks you not to mention it to anyone else because leadership is already stressed.",
        choices: [
          {
            text: "Send the file right away",
            effect: { securityScore: -30, riskLevel: 30, timePressure: 15 },
            next: "fake_onedrive"
          },
          {
            text: "Verify using a known phone number first",
            effect: { securityScore: 20, riskLevel: -15, timePressure: -5 },
            next: "fake_onedrive"
          },
          {
            text: "Ask for more detail inside Teams and wait",
            effect: { securityScore: -5, riskLevel: 10, timePressure: 5 },
            next: "fake_onedrive"
          }
        ]
      },
      fake_onedrive: {
        type: "file",
        title: "Shared File Alert",
        sender: "Microsoft OneDrive",
        content: "You receive a file-sharing alert claiming a protected document is waiting for review. The page requests your credentials before opening the file.",
        detail: "The branding is convincing. The page looks almost identical to a normal Microsoft sign-in flow.",
        highRiskContent: "Because your risk level is already elevated, the simulation adds a realistic company-branded background and recent document name to make the prompt more persuasive.",
        choices: [
          {
            text: "Log in to view the file",
            effect: { securityScore: -40, riskLevel: 35, timePressure: 10 },
            next: "calendar_invite"
          },
          {
            text: "Open OneDrive from your normal bookmark instead",
            effect: { securityScore: 15, riskLevel: -10, timePressure: 0 },
            next: "calendar_invite"
          },
          {
            text: "Forward the alert to a colleague for a second opinion",
            effect: { securityScore: -5, riskLevel: 10, timePressure: 5 },
            next: "calendar_invite"
          }
        ]
      },
      calendar_invite: {
        type: "calendar",
        title: "Calendar Invite",
        sender: "HR Distribution List",
        content: "A calendar invite titled Mandatory Policy Review arrives with a link to an external document. The note says completion is required today to avoid a compliance issue.",
        detail: "The format feels routine, which lowers suspicion. The deadline, however, creates pressure to act fast.",
        highRiskContent: "If your risk is high, the invite references a recent internal policy update and names a real department to increase credibility.",
        choices: [
          {
            text: "Click the link and review it immediately",
            effect: { securityScore: -30, riskLevel: 25, timePressure: 15 },
            next: "ending"
          },
          {
            text: "Check the sender and access the policy through the intranet",
            effect: { securityScore: 20, riskLevel: -20, timePressure: -5 },
            next: "ending"
          },
          {
            text: "Accept the invite and deal with it later",
            effect: { securityScore: -10, riskLevel: 10, timePressure: 10 },
            next: "ending"
          }
        ]
      },
      ending: {
        type: "ending",
        title: "Simulation Complete",
        content: "Your decisions shaped the final outcome. Review the result below before restarting the simulation.",
        choices: []
      }
    };

    ensureStyles();

    var root = document.createElement("div");
    root.className = "sim-module";
    container.innerHTML = "";
    container.appendChild(root);

    renderScenario();

    function emitStatus(){
      var detail = {
        currentScenario: state.currentScenario,
        isComplete: state.currentScenario === "ending",
        securityScore: state.securityScore,
        riskLevel: state.riskLevel,
        timePressure: state.timePressure,
        history: state.history.slice()
      };
      if(detail.isComplete){
        detail.outcome = getEndingOutcome();
      }
      container.dispatchEvent(new CustomEvent("simulation-status", { detail: detail }));
    }

    function ensureStyles(){
      if(document.getElementById("sim-module-styles")) return;

      var style = document.createElement("style");
      style.id = "sim-module-styles";
      style.textContent =
        ".sim-module{--sim-bg:#f6f9fc;--sim-panel:#ffffff;--sim-line:#d9e4ef;--sim-text:#19324a;--sim-muted:#627d98;--sim-brand:#183a63;--sim-brand-2:#2c74b6;--sim-good:#1f8a4c;--sim-warn:#d48a00;--sim-bad:#c23b32;font-family:Segoe UI,Arial,sans-serif;color:var(--sim-text);background:radial-gradient(circle at top right,rgba(44,116,182,.10) 0,transparent 24%),radial-gradient(circle at bottom left,rgba(23,59,103,.07) 0,transparent 28%),linear-gradient(180deg,#fbfdff 0,#eef4f9 100%);border:1px solid rgba(24,58,99,.08);border-radius:24px;box-shadow:0 28px 60px rgba(22,52,86,.12);overflow:hidden;position:relative}" +
        ".sim-module:before{content:'';position:absolute;right:-74px;top:-78px;width:220px;height:220px;border-radius:50%;background:rgba(44,116,182,.08)}" +
        ".sim-module:after{content:'';position:absolute;left:-96px;bottom:-120px;width:260px;height:200px;border-radius:50%;background:rgba(23,59,103,.05)}" +
        ".sim-module > *{position:relative;z-index:1}" +
        ".sim-module *{box-sizing:border-box}" +
        ".sim-module__header{display:flex;justify-content:space-between;gap:18px;align-items:stretch;padding:22px 24px 20px;background:linear-gradient(135deg,#102945 0,#18385f 46%,#285b8e 100%);color:#fff;position:relative;overflow:hidden}" +
        ".sim-module__header:after{content:'';position:absolute;left:24px;bottom:0;width:92px;height:3px;border-radius:999px;background:rgba(255,255,255,.26)}" +
        ".sim-module__title{font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:700;line-height:1.2;margin-bottom:6px}" +
        ".sim-module__subtitle{font-size:13px;line-height:1.65;max-width:560px;color:rgba(255,255,255,.84)}" +
        ".sim-module__stats{display:grid;grid-template-columns:repeat(3,minmax(110px,1fr));gap:10px;min-width:320px}" +
        ".sim-module__stat{padding:14px 14px 12px;border-radius:16px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(6px);box-shadow:inset 0 1px 0 rgba(255,255,255,.16)}" +
        ".sim-module__stat-label{font-size:11px;text-transform:uppercase;letter-spacing:.9px;color:rgba(255,255,255,.72);margin-bottom:8px}" +
        ".sim-module__stat-value{font-size:28px;font-weight:700;line-height:1}" +
        ".sim-module__body{padding:24px}" +
        ".sim-module__stage{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:18px}" +
        ".sim-module__badge{display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;background:linear-gradient(180deg,#eef5fc 0,#e3eef8 100%);color:#173c67;border:1px solid #d7e5f4;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.9px;box-shadow:0 8px 18px rgba(25,61,99,.06)}" +
        ".sim-module__history{font-size:12px;color:var(--sim-muted);padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.82);border:1px solid #dbe6f1;box-shadow:0 6px 14px rgba(25,61,99,.04)}" +
        ".sim-module__panel{background:rgba(255,255,255,.92);border:1px solid var(--sim-line);border-radius:20px;padding:26px;min-height:280px;position:relative;overflow:hidden;box-shadow:0 18px 38px rgba(22,52,86,.09)}" +
        ".sim-module__panel.fade-in{animation:simFade .28s ease}" +
        ".sim-module__meta{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}" +
        ".sim-module__chip{padding:8px 11px;border-radius:999px;background:#fff;border:1px solid #dbe6f0;color:#47627d;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;box-shadow:0 8px 16px rgba(25,61,99,.04)}" +
        ".sim-module__scenario-title{font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;margin-bottom:14px;color:#163757}" +
        ".sim-module__content{font-size:16px;line-height:1.8;color:#283f55;margin-bottom:14px;white-space:pre-line;padding:18px 20px;border-radius:16px;background:linear-gradient(180deg,#fbfdff 0,#f3f8fc 100%);border:1px solid #dbe7f3;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}" +
        ".sim-module__detail{padding:16px 18px;border-left:4px solid #2c74b6;background:#f5f9fd;border-radius:14px;font-size:14px;line-height:1.72;color:#3b556f}" +
        ".sim-module__detail--high-risk{margin-top:12px;border-left-color:#d48a00;background:#fff8ea;color:#6f5200}" +
        ".sim-module__choices{display:grid;gap:14px;margin-top:20px}" +
        ".sim-module__choice{width:100%;text-align:left;padding:16px 18px;border-radius:16px;border:1px solid #d8e4f0;background:linear-gradient(180deg,#ffffff 0,#f8fbfe 100%);color:#17324a;font-size:15px;line-height:1.58;font-weight:600;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease,background .15s ease;box-shadow:0 12px 22px rgba(26,58,107,.05)}" +
        ".sim-module__choice:hover{transform:translateY(-2px);border-color:#2c74b6;background:#f4f9fd;box-shadow:0 16px 28px rgba(26,58,107,.10)}" +
        ".sim-module__choice:active{transform:translateY(0)}" +
        ".sim-module__choice:focus-visible{outline:3px solid rgba(44,116,182,.28);outline-offset:3px}" +
        ".sim-module__ending{display:grid;gap:18px}" +
        ".sim-module__result{padding:20px 22px;border-radius:18px;border:1px solid #d9e5ef;box-shadow:0 14px 28px rgba(22,52,86,.06)}" +
        ".sim-module__result--champion{background:#ebfaf1;border-color:#bee6cc;color:#175a38}" +
        ".sim-module__result--close{background:#fff8ea;border-color:#efd699;color:#775400}" +
        ".sim-module__result--incident{background:#fdf1f0;border-color:#f0c8c4;color:#8b2e28}" +
        ".sim-module__result-title{font-family:Georgia,'Times New Roman',serif;font-size:26px;margin-bottom:8px}" +
        ".sim-module__summary{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:12px}" +
        ".sim-module__summary-card{padding:16px;border-radius:16px;background:linear-gradient(180deg,#fbfdff 0,#f4f8fc 100%);border:1px solid #dce7f1;box-shadow:0 10px 22px rgba(25,61,99,.05)}" +
        ".sim-module__summary-card span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#69839d;margin-bottom:7px}" +
        ".sim-module__summary-card strong{font-size:24px;color:#173b67}" +
        ".sim-module__overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(12,28,45,.48);z-index:5;animation:simFade .2s ease}" +
        ".sim-module__overlay-card{background:linear-gradient(180deg,#ffffff 0,#f8fbfd 100%);border-radius:20px;padding:24px 26px;box-shadow:0 22px 44px rgba(10,28,46,.22);border:1px solid #dbe5ef;min-width:280px;text-align:center;animation:simSlide .24s ease}" +
        ".sim-module__overlay-title{font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#163757;margin-bottom:8px}" +
        ".sim-module__overlay-text{font-size:14px;color:#516b86;line-height:1.7}" +
        "@keyframes simFade{from{opacity:0}to{opacity:1}}" +
        "@keyframes simSlide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}" +
        ".dark-mode .sim-module{background:radial-gradient(circle at top right,rgba(44,116,182,.16) 0,transparent 24%),radial-gradient(circle at bottom left,rgba(23,59,103,.12) 0,transparent 28%),linear-gradient(180deg,#0e1824 0,#0a1420 100%);border-color:#22384d;box-shadow:0 28px 56px rgba(0,0,0,.32);color:#e7f0fb}" +
        ".dark-mode .sim-module__header{background:linear-gradient(135deg,#08111b 0,#102133 46%,#18385c 100%)}" +
        ".dark-mode .sim-module__stat{background:rgba(10,24,38,.56);border-color:rgba(160,190,220,.14)}" +
        ".dark-mode .sim-module__badge,.dark-mode .sim-module__history,.dark-mode .sim-module__chip,.dark-mode .sim-module__summary-card{background:#132538;border-color:#29415b;color:#d8e7f7;box-shadow:none}" +
        ".dark-mode .sim-module__panel,.dark-mode .sim-module__content{background:linear-gradient(180deg,#101d2c 0,#0d1825 100%);border-color:#22384d;color:#dbe7f3;box-shadow:0 16px 30px rgba(0,0,0,.22)}" +
        ".dark-mode .sim-module__scenario-title,.dark-mode .sim-module__summary-card strong{color:#eef5ff}" +
        ".dark-mode .sim-module__detail{background:#132538;border-left-color:#3a7dc4;color:#bfd1e3}" +
        ".dark-mode .sim-module__detail--high-risk{background:#352813;border-left-color:#c48a24;color:#ffd98f}" +
        ".dark-mode .sim-module__choice{background:linear-gradient(180deg,#132538 0,#102131 100%);border-color:#29415b;color:#e7f0fb;box-shadow:none}" +
        ".dark-mode .sim-module__choice:hover{background:#183049;border-color:#4270a0;box-shadow:0 16px 28px rgba(0,0,0,.2)}" +
        ".dark-mode .sim-module__result{border-color:#29415b;box-shadow:none}" +
        ".dark-mode .sim-module__result--champion{background:#173324;color:#a6e6bc;border-color:#2b6f4c}" +
        ".dark-mode .sim-module__result--close{background:#352813;color:#ffd98f;border-color:#7d6122}" +
        ".dark-mode .sim-module__result--incident{background:#34191b;color:#ffb8b0;border-color:#7d3840}" +
        ".dark-mode .sim-module__overlay-card{background:linear-gradient(180deg,#132538 0,#102131 100%);border-color:#29415b}" +
        ".dark-mode .sim-module__overlay-title{color:#eef5ff}" +
        ".dark-mode .sim-module__overlay-text{color:#a8bed3}" +
        "@media (max-width:860px){.sim-module__header{flex-direction:column}.sim-module__stats{grid-template-columns:repeat(3,1fr);min-width:0}.sim-module__summary{grid-template-columns:1fr}.sim-module__body{padding:18px}.sim-module__panel{padding:20px}}" +
        "@media (max-width:620px){.sim-module__stats{grid-template-columns:1fr}.sim-module__title{font-size:22px}.sim-module__scenario-title{font-size:24px}.sim-module__panel{padding:18px}}";
      document.head.appendChild(style);
    }

    function renderScenario(){
      clearTimers();

      var scenario = scenarios[state.currentScenario];
      var highRisk = state.riskLevel >= 50;

      root.innerHTML =
        renderHeader() +
        "<div class=\"sim-module__body\">" +
          "<div class=\"sim-module__stage\">" +
            "<span class=\"sim-module__badge\">" + formatScenarioType(scenario.type) + "</span>" +
            "<div class=\"sim-module__history\">Decisions logged: " + state.history.length + "</div>" +
          "</div>" +
          "<div class=\"sim-module__panel fade-in\" id=\"sim-panel\">" +
            renderScenarioPanel(scenario, highRisk) +
          "</div>" +
        "</div>";

      if(scenario.type === "chat"){
        simulateChatIntro();
      }

      if(scenario.type === "phone"){
        showCallOverlay();
      }

      emitStatus();
    }

    function renderHeader(){
      return (
        "<div class=\"sim-module__header\">" +
          "<div>" +
            "<div class=\"sim-module__title\">Branching Exercise</div>" +
            "<div class=\"sim-module__subtitle\">A module exercise showing how earlier decisions raise risk and make later social engineering attempts more persuasive.</div>" +
          "</div>" +
          "<div class=\"sim-module__stats\">" +
            renderStat("Security Score", state.securityScore) +
            renderStat("Risk Level", state.riskLevel) +
            renderStat("Time Pressure", state.timePressure) +
          "</div>" +
        "</div>"
      );
    }

    function renderStat(label, value){
      return (
        "<div class=\"sim-module__stat\">" +
          "<div class=\"sim-module__stat-label\">" + label + "</div>" +
          "<div class=\"sim-module__stat-value\">" + value + "</div>" +
        "</div>"
      );
    }

    function renderScenarioPanel(scenario, highRisk){
      if(scenario.type === "ending"){
        return renderEnding();
      }

      var html =
        "<div class=\"sim-module__meta\">" +
          renderMetaChip("Current Scenario", scenario.title) +
          renderMetaChip("Source", scenario.sender || scenario.caller || "Simulation feed") +
          renderMetaChip("Risk Context", highRisk ? "Elevated persuasion" : "Standard persuasion") +
        "</div>" +
        "<div class=\"sim-module__scenario-title\">" + scenario.title + "</div>" +
        "<div class=\"sim-module__content\">" + scenario.content + "</div>" +
        "<div class=\"sim-module__detail\">" + scenario.detail + "</div>";

      if(highRisk && scenario.highRiskContent){
        html += "<div class=\"sim-module__detail sim-module__detail--high-risk\">" + scenario.highRiskContent + "</div>";
      }

      html += "<div class=\"sim-module__choices\">";
      scenario.choices.forEach(function(choice, index){
        html += "<button class=\"sim-module__choice\" type=\"button\" data-choice-index=\"" + index + "\">" + choice.text + "</button>";
      });
      html += "</div>";

      queueMicrotask(function(){
        bindChoiceButtons();
      });

      return html;
    }

    function renderMetaChip(label, value){
      return "<span class=\"sim-module__chip\">" + label + ": " + value + "</span>";
    }

    function bindChoiceButtons(){
      root.querySelectorAll(".sim-module__choice").forEach(function(button){
        button.addEventListener("click", function(){
          var scenario = scenarios[state.currentScenario];
          var choice = scenario.choices[Number(button.getAttribute("data-choice-index"))];
          handleChoice(choice);
        });
      });
    }

    function handleChoice(choice){
      state.history.push({
        scenario: state.currentScenario,
        choice: choice.text,
        timestamp: Date.now()
      });

      updateState(choice.effect || {});
      goToNextScenario(choice.next);
    }

    function updateState(effect){
      state.securityScore = clamp(state.securityScore + (effect.securityScore || 0), 0, 180);
      state.riskLevel = clamp(state.riskLevel + (effect.riskLevel || 0), 0, 100);
      state.timePressure = clamp(state.timePressure + (effect.timePressure || 0), 0, 100);
    }

    function goToNextScenario(nextScenario){
      state.currentScenario = nextScenario || "ending";
      renderScenario();
    }

    function renderEnding(){
      var outcome = getEndingOutcome();
      return (
        "<div class=\"sim-module__ending fade-in\">" +
          "<div class=\"sim-module__result sim-module__result--" + outcome.tone + "\">" +
            "<div class=\"sim-module__result-title\">" + outcome.title + "</div>" +
            "<div class=\"sim-module__content\">" + outcome.message + "</div>" +
          "</div>" +
          "<div class=\"sim-module__summary\">" +
            "<div class=\"sim-module__summary-card\"><span>Security Score</span><strong>" + state.securityScore + "</strong></div>" +
            "<div class=\"sim-module__summary-card\"><span>Risk Level</span><strong>" + state.riskLevel + "</strong></div>" +
            "<div class=\"sim-module__summary-card\"><span>Time Pressure</span><strong>" + state.timePressure + "</strong></div>" +
          "</div>" +
          "<div class=\"sim-module__detail\">History: " + state.history.map(function(entry){ return entry.scenario + " -> " + entry.choice; }).join(" | ") + "</div>" +
          "<div class=\"sim-module__choices\">" +
            "<button class=\"sim-module__choice\" type=\"button\" id=\"sim-restart-btn\">Replay Exercise</button>" +
          "</div>" +
        "</div>"
      );
    }

    function getEndingOutcome(){
      if(state.securityScore > 120 && state.riskLevel < 30){
        return {
          title: "Security Champion",
          tone: "champion",
          message: "You maintained strong verification habits, kept risk low, and resisted attempts to manipulate urgency and trust."
        };
      }

      if(state.riskLevel < 70){
        return {
          title: "Close Call",
          tone: "close",
          message: "You avoided the most severe outcome, but some choices increased risk. A more disciplined response would have reduced exposure earlier."
        };
      }

      return {
        title: "Major Incident",
        tone: "incident",
        message: "Compounding decisions increased risk across the simulation. Later attacks became more convincing because early controls were not applied consistently."
      };
    }

    function simulateChatIntro(){
      var panel = root.querySelector("#sim-panel");
      if(!panel) return;

      var overlay = document.createElement("div");
      overlay.className = "sim-module__overlay";
      overlay.innerHTML =
        "<div class=\"sim-module__overlay-card\">" +
          "<div class=\"sim-module__overlay-title\">New Teams Message</div>" +
          "<div class=\"sim-module__overlay-text\">Incoming internal chat alert...</div>" +
        "</div>";
      panel.appendChild(overlay);

      timers.push(setTimeout(function(){
        if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 1200));
    }

    function showCallOverlay(){
      var panel = root.querySelector("#sim-panel");
      if(!panel) return;

      var overlay = document.createElement("div");
      overlay.className = "sim-module__overlay";
      overlay.innerHTML =
        "<div class=\"sim-module__overlay-card\">" +
          "<div class=\"sim-module__overlay-title\">Incoming call...</div>" +
          "<div class=\"sim-module__overlay-text\">A caller is waiting and sounding urgent.</div>" +
        "</div>";
      panel.appendChild(overlay);

      timers.push(setTimeout(function(){
        if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 1400));
    }

    function clearTimers(){
      while(timers.length){
        clearTimeout(timers.pop());
      }
    }

    function clamp(value, min, max){
      return Math.max(min, Math.min(max, value));
    }

    function formatScenarioType(type){
      if(type === "phone") return "Phone";
      if(type === "chat") return "Chat";
      if(type === "file") return "File Share";
      if(type === "calendar") return "Calendar";
      if(type === "ending") return "Outcome";
      return "Email";
    }

    root.addEventListener("click", function(event){
      if(event.target && event.target.id === "sim-restart-btn"){
        state = {
          securityScore: 100,
          riskLevel: 0,
          timePressure: 0,
          currentScenario: "vendor_email",
          history: []
        };
        renderScenario();
      }
    });
  }

  global.initSimulation = initSimulation;
})(window);
