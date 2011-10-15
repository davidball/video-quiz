/* Fundamental quiz functionality. Distinct from jquery/youtube functionality. */

// CP: Global variable to hold all quiz objects for purposes of grading, submitting, and time response. Allows for multiple quizzes.
//  (Refactor to make non-global if you like)
var quizList = [];
// TODO: Link a specific video with each quiz, so multiple videos might play, stop, and seek at different times without
// messing up other quizzes. Stupid workaround for now:
var activeQuiz = 0;

var Quiz = function(spec) {
	this.time = 0;
	this.lastUpdated = new Date().getTime();
	this.questionsAnswered = 0;
	this.questionsAnsweredCorrectly = 0;
	this.videoState = 0;
	this.id = quizList.length;
	quizList.push(this);
	
	for (var a in spec)		// turn spec into object, basically.
		this[a] = spec[a];
	console.log("Creating quiz with " + this.questions.length + " events/questions." );
	
};

Quiz.prototype = {
	onTick: function(absoluteTime) {
		var now = new Date().getTime();
		var delta = (now - this.lastUpdated) / 1000;	// seconds, not milliseconds
		this.lastUpdated = now;
		if (this.responseTimer > 0)
		{
			this.responseTimer -= delta;
			if (this.responseTimer <= 0)
			{
				this.responseText.remove();
				console.log("Removed response normally.");
			}
		}
		if (absoluteTime)
			this.time = absoluteTime;
		
		if ( (this.videoState == 1) || (absoluteTime) )	// playing or going to a specific moment
		{
			if (! absoluteTime)
				this.time += delta;
			
			if ( (this.time > this.result.time) && (! this.result.shown))	// quiz complete...
			{
				// This is really rough right now.
				if (this.result.oncomplete)
					this.result.oncomplete.call(this);
				this.result.shown = true;
			}
			
			var quiz = this;
			
			$.each (this.questions, function(question_index) {
				var question = quiz.questions[question_index];
				if ( (question.start > quiz.time)	||  (question.stop < quiz.time) )	// question should not be displayed...
				{
					if (question.live)	// clear it if we're being displayed
						quiz.clearQuestion(question);
					// TODO: when implementing seek, make sure to un-answer questions you rewind past.
					// Take into account that they may have ticked up the .questionsAnswered and .questionsAnsweredCorrectly values.
				}
				else		// question is active!
				{
					if ( (! question.live) && (! question.answered) )	// we need to display the question!
						quiz.showQuestion(question);
				}
				
			});
			
		}
		
	},
	
	showQuestion: function(question) {
		var question_index = this.questions.indexOf(question) 
		if ( (question.live) || (question.answered) )	// this should never happen, but better safe than sorry.
		{
			console.log("Attempted to show question " + question_index + ", but it's already being shown!");
			return;
		}
		
		
		// The iframe can mess with the quiz div something awful, so make sure it exists before you do anything else.
		// TODO Make this support multiple videos.
		var vc = $('#videoContainer');
		// Does it exist? Make sure we have the screen object.
		var questionContainer = vc.find('#questionContainer' + this.id);
		if (questionContainer.length === 0) questionContainer = $('<div class="questionContainer" id="questionContainer' + this.id + '"/>').appendTo(vc);
		if (questionContainer.length === 0) {
			alert("Fatal error; Cannot find or create a question container.");
			return;
		}
		this.container = questionContainer;	// for clearing purposes.
		
		
		// CP Page might contain multiple quizzes for different videos or different difficulties on the same video.
		var quiz_id = "quiz_" + this.id;
				
		// Add the question text.
		var questionDOM;
		if (question.text) {
			//text is optional. afterall the question may be in the video itself.
			// TODO: Make text block colorable and so on.
			questionDOM = $('<div class="questionText"/>').html(question.text).appendTo(questionContainer);
			if (question.left) questionDOM.css('left', question.left);
			if (question.top) questionDOM.css('top', question.top);
		}
		// Multiple questions may be on screen at the same time.
		var question_id = question.id || ('question_' + question_index);
		question_id = quiz_id + "_" + question_id;
		
		var answers = question.answers;
		if (! answers) answers = [];	// no answers? Must be a descriptive text overlay.
		
		var col = 200;
		if (question.column)
			col = question.column;
		var row = 30;
		if (question.row)
			row = question.row;
		
		$.each(answers,
		function(index) {
			var answer_id = this.id || ('answer_' + index);
			answer_id = question_id + "_" + answer_id;		// IE, "quiz_0_question_0_answer_0" Easy to explode, if necessary.
			
			// CP Not an expert at jquery, can't get ".bind('click', quizAnswer)" to work. Brute-force insertion:
			var answer_def = "<div class='answer' onclick='quizAnswer(this.id);'>" + this.text + "</div>";
			
			// TODO: right now, answers set to 150px width to prevent multilining. Probably a better way to do it.
			
			var left = col;
			if (this.left) left = this.left;
			var top = row;
			if (this.top) top = this.top;
			else row += 40;
			
			// Add to question container, not the questionDOM, or it all gets offset by the question text's offset.
			var cb = $(answer_def).attr('id', answer_id).css('left', left).css('top', top).appendTo(questionContainer);
			
		});
		question.live = true;
		console.log("Question " + question_index + " shown.");
	},
	
	clearQuestion: function(question) {
		if (! question) return; // shouldn't happen, but...
		console.log("Clearing question " + this.questions.indexOf(question));
		this.container.remove();
		question.live = false;
	},
	
    onAnswer:function(question, answer) {
        
		question.answered = true;
		question.answer = answer;
		this.clearQuestion(question);
		
		if (answer.onClick)
		{
			// TODO: add in credentials as arguments if using students and logged-in browsing.
			answer.onClick(this, question, answer);
		}
		
		if (answer.response)	// text we pop up when the student clicks on an answer
		{
			if (answer.response.Duration)
				this.responseTimer = answer.response.Duration;
			else if (question.responseDuration)
				this.responseTimer = question.responseDuration;
			else if (this.responseDuration)
				this.responseTimer = this.responseDuration;
			else
				this.responseTimer = 3;	
			
			// Clear existing, if any.
			if (this.responseText) this.responseText.remove();
			
			
			var vc = $('#videoContainer');
			this.responseText = $('<div class="quizResponse" />').appendTo(vc);
			if (answer.response.left)
				var left = answer.response.left;
			else
				left = 50;
			if (answer.response.top)
				var top = answer.response.top;
			else
				top = 50;
			var responseDOM = this.responseText.css("left", left).css("top", top).html(answer.response.text);
			if (answer.response.background)
				responseDOM.css("background-color", answer.response.background);
		}
    
		this.questionsAnswered++;
		if (answer.correct)
			this.questionsAnsweredCorrectly++;
    },
    onComplete:function() {
        
    },
    displayResults:function() {
        
    }
}



// CP Here are some quiz functions required to do time-based responses. Someone more familiar with jquery best practice could probably
// put these in a better location. In prototype, I just stick them in classes - quiz class, question class, maybe an answer class.
// Replace this with an absolute time function once we figure out how to get youtube to give us one.
var quizTimer = setInterval("quizTick();", 500);	// every half second is plenty - we're not redrawing animations or anything.

function quizTick() {
			
	$.each(quizList, function(quiz_index) {
		var quiz = quizList[quiz_index];
		quiz.onTick(0);	// not using absolute time.
	});
};

// Global redirect finds correct quiz to point at.
function quizAnswer(rawAnswerID) {
	try
	{
		var bits = rawAnswerID.split('_');
		if (bits.length != 6) throw "illegal id";
		
		var quiz_id = bits[1];
		var question_id = bits[3];
		var answer_id = bits[5];
		
		var quiz = quizList[quiz_id];
		if (! quiz) throw "no quiz";
		var question = quiz.questions[question_id];
		if (! question) throw "no question";
		var answer = question.answers[answer_id];
		if (! answer) throw "no answer";
		
		quiz.onAnswer( question, answer);
		
	}
	catch (e)
	{
		switch (e)
		{
			default:
				alert("Error: " + e);
				break;
			case "illegal id":
				alert("Answer function was called with ID " + rawAnswerID + ", which doesn't break down into accepted 'quiz_X_question_Y_answer_Z' format.");
				break;
			case "no quiz":
				alert("The specified quiz (quiz " + quiz_id + ") was not found.");
				break;
			case "no question":
				alert("Quiz " + quiz_id + " appears to have no question " + question_id + ".");
				break;
			case "no answer":
				alert("Quiz " + quiz_id + ", question " + question_id + " appears to have no answer " + answer_id + ".");
				break;
		}
	}
};