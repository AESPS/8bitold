"use strict";

require("./main");

require("bootstrap/js/dist/tab");

var _ezq = require("../ezq");

var _utils = require("../utils");

var _dayjs = _interopRequireDefault(require("dayjs"));

var _relativeTime = _interopRequireDefault(require("dayjs/plugin/relativeTime"));

var _jquery = _interopRequireDefault(require("jquery"));

var _CTFd = _interopRequireDefault(require("../CTFd"));

var _config = _interopRequireDefault(require("../config"));

var _highlight = _interopRequireDefault(require("highlight.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

_dayjs["default"].extend(_relativeTime["default"]);

_CTFd["default"]._internal.challenge = {};
var challenges = [];
var solves = [];

var loadChal = function loadChal(id) {
  var chal = _jquery["default"].grep(challenges, function (chal) {
    return chal.id == id;
  })[0];

  if (chal.type === "hidden") {
    (0, _ezq.ezAlert)({
      title: "Challenge Hidden!",
      body: "You haven't unlocked this challenge yet!",
      button: "Got it!"
    });
    return;
  }

  displayChal(chal);
};

var loadChalByName = function loadChalByName(name) {
  var idx = name.lastIndexOf("-");
  var pieces = [name.slice(0, idx), name.slice(idx + 1)];
  var id = pieces[1];

  var chal = _jquery["default"].grep(challenges, function (chal) {
    return chal.id == id;
  })[0];

  displayChal(chal);
};

var displayChal = function displayChal(chal) {
  return Promise.all([_CTFd["default"].api.get_challenge({
    challengeId: chal.id
  }), _jquery["default"].getScript(_config["default"].urlRoot + chal.script), _jquery["default"].get(_config["default"].urlRoot + chal.template)]).then(function (responses) {
    var challenge = _CTFd["default"]._internal.challenge;
    (0, _jquery["default"])("#challenge-window").empty(); // Inject challenge data into the plugin

    challenge.data = responses[0].data; // Call preRender function in plugin

    challenge.preRender(); // Build HTML from the Jinja response in API

    (0, _jquery["default"])("#challenge-window").append(responses[0].data.view);
    (0, _jquery["default"])("#challenge-window #challenge-input").addClass("form-control");
    (0, _jquery["default"])("#challenge-window #challenge-submit").addClass("btn btn-md btn-outline-secondary float-right");
    var modal = (0, _jquery["default"])("#challenge-window").find(".modal-dialog");

    if (window.init.theme_settings && window.init.theme_settings.challenge_window_size) {
      switch (window.init.theme_settings.challenge_window_size) {
        case "sm":
          modal.addClass("modal-sm");
          break;

        case "lg":
          modal.addClass("modal-lg");
          break;

        case "xl":
          modal.addClass("modal-xl");
          break;

        default:
          break;
      }
    }

    (0, _jquery["default"])(".challenge-solves").click(function (_event) {
      getSolves((0, _jquery["default"])("#challenge-id").val());
    });
    (0, _jquery["default"])(".nav-tabs a").click(function (event) {
      event.preventDefault();
      (0, _jquery["default"])(this).tab("show");
    }); // Handle modal toggling

    (0, _jquery["default"])("#challenge-window").on("hide.bs.modal", function (_event) {
      (0, _jquery["default"])("#challenge-input").removeClass("wrong");
      (0, _jquery["default"])("#challenge-input").removeClass("correct");
      (0, _jquery["default"])("#incorrect-key").slideUp();
      (0, _jquery["default"])("#correct-key").slideUp();
      (0, _jquery["default"])("#already-solved").slideUp();
      (0, _jquery["default"])("#too-fast").slideUp();
    });
    (0, _jquery["default"])(".load-hint").on("click", function (_event) {
      loadHint((0, _jquery["default"])(this).data("hint-id"));
    });
    (0, _jquery["default"])("#challenge-submit").click(function (event) {
      event.preventDefault();
      (0, _jquery["default"])("#challenge-submit").addClass("disabled-button");
      (0, _jquery["default"])("#challenge-submit").prop("disabled", true);

      _CTFd["default"]._internal.challenge.submit().then(renderSubmissionResponse).then(loadChals).then(markSolves);
    });
    (0, _jquery["default"])("#challenge-input").keyup(function (event) {
      if (event.keyCode == 13) {
        (0, _jquery["default"])("#challenge-submit").click();
      }
    });
    challenge.postRender();
    (0, _jquery["default"])("#challenge-window").find("pre code").each(function (_idx) {
      _highlight["default"].highlightBlock(this);
    });
    window.location.replace(window.location.href.split("#")[0] + "#".concat(chal.name, "-").concat(chal.id));
    (0, _jquery["default"])("#challenge-window").modal();
  });
};

function renderSubmissionResponse(response) {
  var result = response.data;
  var result_message = (0, _jquery["default"])("#result-message");
  var result_notification = (0, _jquery["default"])("#result-notification");
  var answer_input = (0, _jquery["default"])("#challenge-input");
  result_notification.removeClass();
  result_message.text(result.message);

  if (result.status === "authentication_required") {
    window.location = _CTFd["default"].config.urlRoot + "/login?next=" + _CTFd["default"].config.urlRoot + window.location.pathname + window.location.hash;
    return;
  } else if (result.status === "incorrect") {
    // Incorrect key
    result_notification.addClass("alert alert-danger alert-dismissable text-center");
    result_notification.slideDown();
    answer_input.removeClass("correct");
    answer_input.addClass("wrong");
    setTimeout(function () {
      answer_input.removeClass("wrong");
    }, 3000);
  } else if (result.status === "correct") {
    // Challenge Solved
    result_notification.addClass("alert alert-success alert-dismissable text-center");
    result_notification.slideDown();

    if ((0, _jquery["default"])(".challenge-solves").text().trim()) {
      // Only try to increment solves if the text isn't hidden
      (0, _jquery["default"])(".challenge-solves").text(parseInt((0, _jquery["default"])(".challenge-solves").text().split(" ")[0]) + 1 + " Solves");
    }

    answer_input.val("");
    answer_input.removeClass("wrong");
    answer_input.addClass("correct");
  } else if (result.status === "already_solved") {
    // Challenge already solved
    result_notification.addClass("alert alert-info alert-dismissable text-center");
    result_notification.slideDown();
    answer_input.addClass("correct");
  } else if (result.status === "paused") {
    // CTF is paused
    result_notification.addClass("alert alert-warning alert-dismissable text-center");
    result_notification.slideDown();
  } else if (result.status === "ratelimited") {
    // Keys per minute too high
    result_notification.addClass("alert alert-warning alert-dismissable text-center");
    result_notification.slideDown();
    answer_input.addClass("too-fast");
    setTimeout(function () {
      answer_input.removeClass("too-fast");
    }, 3000);
  }

  setTimeout(function () {
    (0, _jquery["default"])(".alert").slideUp();
    (0, _jquery["default"])("#challenge-submit").removeClass("disabled-button");
    (0, _jquery["default"])("#challenge-submit").prop("disabled", false);
  }, 3000);
}

function markSolves() {
  challenges.map(function (challenge) {
    if (challenge.solved_by_me) {
      var btn = (0, _jquery["default"])("button[value=\"".concat(challenge.id, "\"]"));
      btn.addClass("solved-challenge");
      btn.prepend("<i class='fas fa-check corner-button-check'></i>");
    }
  });
}

function getSolves(id) {
  return _CTFd["default"].api.get_challenge_solves({
    challengeId: id
  }).then(function (response) {
    var data = response.data;
    (0, _jquery["default"])(".challenge-solves").text(parseInt(data.length) + " Solves");
    var box = (0, _jquery["default"])("#challenge-solves-names");
    box.empty();

    for (var i = 0; i < data.length; i++) {
      var _id = data[i].account_id;
      var name = data[i].name;
      var date = (0, _dayjs["default"])(data[i].date).fromNow();
      var account_url = data[i].account_url;
      box.append('<tr><td><a href="{0}">{2}</td><td>{3}</td></tr>'.format(account_url, _id, (0, _utils.htmlEntities)(name), date));
    }
  });
}

function loadChals() {
  return _CTFd["default"].api.get_challenge_list().then(function (response) {
    var categories = [];
    var $challenges_board = (0, _jquery["default"])("#challenges-board");
    challenges = response.data;
    $challenges_board.empty();

    for (var i = challenges.length - 1; i >= 0; i--) {
      if (_jquery["default"].inArray(challenges[i].category, categories) == -1) {
        var category = challenges[i].category;
        categories.push(category);
        var categoryid = category.replace(/ /g, "-").hashCode();
        var categoryrow = (0, _jquery["default"])("" + '<div id="{0}-row" class="pt-5">'.format(categoryid) + '<div class="category-header col-md-12 mb-3">' + "</div>" + '<div class="category-challenges col-md-12">' + '<div class="challenges-row col-md-12"></div>' + "</div>" + "</div>");
        categoryrow.find(".category-header").append((0, _jquery["default"])("<h3>" + category + "</h3>"));
        $challenges_board.append(categoryrow);
      }
    }

    for (var _i = 0; _i <= challenges.length - 1; _i++) {
      var chalinfo = challenges[_i];
      var chalid = chalinfo.name.replace(/ /g, "-").hashCode();
      var catid = chalinfo.category.replace(/ /g, "-").hashCode();
      var chalwrap = (0, _jquery["default"])("<div id='{0}' class='col-md-3 d-inline-block'></div>".format(chalid));
      var chalbutton = void 0;

      if (solves.indexOf(chalinfo.id) == -1) {
        chalbutton = (0, _jquery["default"])("<button class='btn btn-dark challenge-button w-100 text-truncate pt-3 pb-3 mb-2' value='{0}'></button>".format(chalinfo.id));
      } else {
        chalbutton = (0, _jquery["default"])("<button class='btn btn-dark challenge-button solved-challenge w-100 text-truncate pt-3 pb-3 mb-2' value='{0}'><i class='fas fa-check corner-button-check'></i></button>".format(chalinfo.id));
      }

      var chalheader = (0, _jquery["default"])("<p>{0}</p>".format(chalinfo.name));
      var chalscore = (0, _jquery["default"])("<span>{0}</span>".format(chalinfo.value));

      for (var j = 0; j < chalinfo.tags.length; j++) {
        var tag = "tag-" + chalinfo.tags[j].value.replace(/ /g, "-");
        chalwrap.addClass(tag);
      }

      chalbutton.append(chalheader);
      chalbutton.append(chalscore);
      chalwrap.append(chalbutton);
      (0, _jquery["default"])("#" + catid + "-row").find(".category-challenges > .challenges-row").append(chalwrap);
    }

    (0, _jquery["default"])(".challenge-button").click(function (_event) {
      loadChal(this.value);
    });
  });
}

function update() {
  return loadChals().then(markSolves);
}

(0, _jquery["default"])(function () {
  update().then(function () {
    if (window.location.hash.length > 0) {
      loadChalByName(decodeURIComponent(window.location.hash.substring(1)));
    }
  });
  (0, _jquery["default"])("#challenge-input").keyup(function (event) {
    if (event.keyCode == 13) {
      (0, _jquery["default"])("#challenge-submit").click();
    }
  });
  (0, _jquery["default"])(".nav-tabs a").click(function (event) {
    event.preventDefault();
    (0, _jquery["default"])(this).tab("show");
  });
  (0, _jquery["default"])("#challenge-window").on("hidden.bs.modal", function (_event) {
    (0, _jquery["default"])(".nav-tabs a:first").tab("show");
    history.replaceState("", window.document.title, window.location.pathname);
  });
  (0, _jquery["default"])(".challenge-solves").click(function (_event) {
    getSolves((0, _jquery["default"])("#challenge-id").val());
  });
  (0, _jquery["default"])("#challenge-window").on("hide.bs.modal", function (_event) {
    (0, _jquery["default"])("#challenge-input").removeClass("wrong");
    (0, _jquery["default"])("#challenge-input").removeClass("correct");
    (0, _jquery["default"])("#incorrect-key").slideUp();
    (0, _jquery["default"])("#correct-key").slideUp();
    (0, _jquery["default"])("#already-solved").slideUp();
    (0, _jquery["default"])("#too-fast").slideUp();
  });
});
setInterval(update, 300000); // Update every 5 minutes.

var displayHint = function displayHint(data) {
  (0, _ezq.ezAlert)({
    title: "Hint",
    body: data.html,
    button: "Got it!"
  });
};

var displayUnlock = function displayUnlock(id) {
  (0, _ezq.ezQuery)({
    title: "Unlock Hint?",
    body: "Are you sure you want to open this hint?",
    success: function success() {
      var params = {
        target: id,
        type: "hints"
      };

      _CTFd["default"].api.post_unlock_list({}, params).then(function (response) {
        if (response.success) {
          _CTFd["default"].api.get_hint({
            hintId: id
          }).then(function (response) {
            displayHint(response.data);
          });

          return;
        }

        (0, _ezq.ezAlert)({
          title: "Error",
          body: response.errors.score,
          button: "Got it!"
        });
      });
    }
  });
};

var loadHint = function loadHint(id) {
  _CTFd["default"].api.get_hint({
    hintId: id
  }).then(function (response) {
    if (response.data.content) {
      displayHint(response.data);
      return;
    }

    displayUnlock(id);
  });
};