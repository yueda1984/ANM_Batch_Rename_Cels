/*
	Batch_Rename_Cels

	Toon Boom Harmony dialog script that allows you to rename multiple cels at once in the timeline.
	Tested on Harmony 15 and 17.
	
		v1.1 - Fixed infinity loop bug while using Replace/Delete operation.
		v1.2 - We can now process multiple layers at once.
		v1.21 - Main dialog widget acts as a child of Harmony application.
		v1.22 - "drawing.elementMode" attribute is changed to "drawing.ELEMENT_MODE" to accomodate Harmony 22 update.


	Installation:
	
	1) Download and Unarchive the zip file.
	2) Locate to your user scripts folder (a hidden folder):
	   https://docs.toonboom.com/help/harmony-17/premium/scripting/import-script.html
	   
	3) There is a folder named "src" inside the zip file. Copy all its contents directly to the folder above.
	4) In Harmony, add ANM_Batch_Rename_Cels on any toolbar.

	
	Direction:
	
	1) Run ANM_Batch_Rename_Cels.	
	2) Select cels in the timeline you want to rename. Selection can be over multiple drawing layers.	
	3) Select one from 3 operations; Sequence Rename, Add New Text and Replace/Delete Text.	
	4) Chose desired settings and then hit Rename button.

	
	Author:

		Yu Ueda		
		Many more useful scripts hor Toon Boom Harmony are available. Please visit raindropmoment.com	
*/


var scriptVer = "1.22";


function ANM_Batch_Rename_Cels()
{	
	var pd = new private_dialog;	
	pd.showUI();
}







function private_dialog()
{
	var pf = new private_functions;
	this.newText = ""; this.findTx = "";
	this.scn = null;

	this.refreshSelection = function()
	{		
		this.frameRange = [];
		var firstFrame = Timeline.firstFrameSel;
		var lastFrame = firstFrame + Timeline.numFrameSel -1;
		for (var fr = firstFrame; fr <= lastFrame; fr++)
			this.frameRange.push(fr);

		var sNodes = selection.selectedNodes();
		this.nodes = sNodes.filter(function(item)
			{	return node.type(item) == "READ";	});	
			
		this.firstNodeCelInfo = pf.getCelInfo(this.frameRange, this.nodes[0]);
	};
	this.refreshSelection();
		
	
	// load preference, set ui state
	this.showUI = function()
	{
		var prefs = this.loadPref();
		this.ui.show();	

		var width = 511;
		var height = 522;
		var coordX = prefs.x;
		var coordY = prefs.y;
		if (about.isWindowsArch())
		{
			coordX += 8;
			coordY += 31;
		}		
		this.ui.setGeometry (coordX, coordY, width, height);
		
		this.opRename = true;
		this.opAddText = false;
		this.opReplace = false;
		this.findTx = "";		
		this.newText = "";		
		this.asPrefix = prefs.prefixRB;
		this.asSuffix = prefs.suffixRB;
		this.numeric = prefs.numericRB;
		var zeroDigit = prefs.digitSB;
		this.digit = zeroDigit;
		this.startNum = 1;
		this.alphabet = prefs.alphabetRB;
		this.addLeadZero = prefs.addLeadZeroCB;
		this.upperCase = prefs.upperCaseCB;
		this.alphabetModel1 = prefs.alphabetModel1RB;
		this.alphabetModel2 = prefs.alphabetModel2RB;		
		this.alphabetModel3 = prefs.alphabetModel3RB;
		this.reverse = false;
		this.keepNewName = prefs.keepNewNameRB;
		this.suffixNewName = prefs.suffixNewNameRB;	
		
		this.ui.opRenameRB.checked = this.opRename;
		this.ui.opAddTextRB.checked = this.opAddText;
		this.ui.opReplaceRB.checked = this.opReplace;
					
		this.ui.prefixRB.checked = this.asPrefix;
		this.ui.suffixRB.checked = this.asSuffix;
		
		this.ui.numericRB.checked = this.numeric;
		this.ui.startNumBox.maximum = 10000;
		this.ui.startNumBox.minimum = 0;
		this.ui.startNumBox.value = this.startNum;
		this.ui.addLeadZeroCB.checked = this.addLeadZero;			
		this.updateComboBox(this.ui.leadZeroDigitCombo, this.leadZeroList);
		this.ui.leadZeroDigitCombo.setCurrentIndex(zeroDigit);		
		
		this.ui.alphabetRB.checked = this.alphabet;
		this.ui.upperCaseCB.checked = this.upperCase;
		this.ui.alphabetModel1RB.checked = this.alphabetModel1;
		this.ui.alphabetModel2RB.checked = this.alphabetModel2;
		this.ui.alphabetModel3RB.checked = this.alphabetModel3;		
		this.updateComboBox(this.ui.startLetter100Combo, this.lowerCaseZList);
		this.updateComboBox(this.ui.startLetter10Combo, this.lowerCaseZList);			
		this.updateComboBox(this.ui.startLetter1Combo, this.lowerCaseList);
		this.ui.startLetter1Combo.setCurrentIndex(1);
		this.ui.reverseCB.checked = this.reverse;
		
		this.ui.keepNewNameRB.checked = this.keepNewName;
		this.ui.suffixNewNameRB.checked = this.suffixNewName;		
		
		this.buildPreview();		
	};

	
	this.loadPref = function()	
	{
		var userPref;		
		var localPath = specialFolders.userScripts;	
		localPath += "/YU_Script_Prefs/ANM_Batch_Rename_Cels_pref.json";
		var file = new File(localPath);
		
		try
		{
			if (file.exists)
			{	
				file.open(1) // read only
				var savedData = file.read();
				file.close();
				userPref = JSON.parse(savedData);				
			}
		}
		catch(err){}			
		
		if (userPref == null)
		{	
			var prefs = {};
			prefs["prefixRB"] = true;
			prefs["suffixRB"] = false;
			prefs["numericRB"] = true;
			prefs["digitSB"] = 0;
			prefs["alphabetRB"] = false;
			prefs["addLeadZeroCB"] = false;
			prefs["upperCaseCB"] = false;
			prefs["alphabetModel1RB"] = true;
			prefs["alphabetModel2RB"] = false;
			prefs["alphabetModel3RB"] = false;
			prefs["keepNewNameRB"] = true;
			prefs["suffixNewNameRB"] = false;
			prefs["x"] = 300;
			prefs["y"] = 200;					
				
			userPref = prefs;
		}
		return userPref;
	};
	
	
	this.savePref = function()
	{
		var prefs = {};
		prefs["prefixRB"] = this.asPrefix;
		prefs["suffixRB"] = this.asSuffix;
		prefs["numericRB"] = this.numeric;	
		prefs["digitSB"] = this.digit;
		prefs["alphabetRB"] = this.alphabet;
		prefs["addLeadZeroCB"] = this.addLeadZero;
		prefs["upperCaseCB"] = this.upperCase;
		prefs["alphabetModel1RB"] = this.alphabetModel1;
		prefs["alphabetModel2RB"] = this.alphabetModel2;
		prefs["alphabetModel3RB"] = this.alphabetModel3;
		prefs["keepNewNameRB"] = this.keepNewName;
		prefs["suffixNewNameRB"] = this.suffixNewName;
		prefs["x"] = this.ui.x;
		prefs["y"] = this.ui.y;		
		
		var localPath = specialFolders.userScripts + "/YU_Script_Prefs";
		var dir = new Dir;
		if (!dir.fileExists(localPath))
			dir.mkdir(localPath);		
		localPath += "/ANM_Batch_Rename_Cels_pref.json";
		var file = new File(localPath);
		
		try
		{	
			file.open(2); // write only
			file.write(JSON.stringify(prefs));
			file.close();
		}
		catch(err){}
	};
	
	
	this.updateComboBox = function(combo, list)
	{
		var comboCount = combo.count;
		var curIdx = combo.currentIndex;
		combo.clear();
		combo.addItems(list);
		
		if (list.length == comboCount)
			combo.setCurrentIndex(curIdx);
	};
	
	
	// change items available on dialog depends on user selected options
	this.setAvailability = function()
	{		
		// add text UI
		if (this.opAddText)
		{
			this.ui.findInput_label.enabled = false;				
			this.ui.findInput.enabled = false;
			this.ui.newTextInput_label.text = "New Text:";			
			this.ui.prefixRB_label.text = "Add Text As:";
			this.ui.prefixRB_label.enabled = true;	
			this.ui.prefixRB.text = "Prefix                                      ";
			this.ui.prefixRB.enabled = true;
			this.ui.suffixRB.text = "Suffix";
			this.ui.suffixRB.enabled = true;			
			this.ui.seqBox.enabled = false;
		}
		
		// replace / remove text UI
		else if (this.opReplace)
		{
			this.ui.findInput_label.enabled = true;				
			this.ui.findInput.enabled = true;
			this.ui.newTextInput_label.text = "Replace:";
			this.ui.prefixRB_label.enabled = false;			
			this.ui.prefixRB.enabled = false;
			this.ui.suffixRB.enabled = false;		
			this.ui.seqBox.enabled = false;		
		}

		// sequence rename UI
		else
		{
			this.ui.findInput_label.enabled = false;				
			this.ui.findInput.enabled = false;	
			this.ui.newTextInput_label.text = "New Text:";				
			this.ui.prefixRB_label.text = "Order:";
			this.ui.prefixRB_label.enabled = true;
			this.ui.prefixRB.text = "Text + Sequential Characters";			
			this.ui.prefixRB.enabled = true;
			this.ui.suffixRB.text = "Sequential Characters + Text";			
			this.ui.suffixRB.enabled = true;			
			this.ui.seqBox.enabled = true;	

			if (this.numeric)
			{
				this.ui.numBox.enabled = true;
				this.ui.alphaBox.enabled = false;
				
				if (this.addLeadZero)
				{			
					this.ui.leadZeroDigitCombo_label.enabled = true;			
					this.ui.leadZeroDigitCombo.enabled = true;			
				}
				else
				{
					this.ui.leadZeroDigitCombo_label.enabled = false;			
					this.ui.leadZeroDigitCombo.enabled = false;				
				}
			}
			else
			{
				this.ui.numBox.enabled = false;
				this.ui.alphaBox.enabled = true;
					
				if (this.upperCase)
				{
					this.ui.alphabetModel1RB.text = "A, B ... Z, ZA, ZB ... (For Short Seq)";
					this.ui.alphabetModel2RB.text = "AA, AB ... AZ, BA, BB ... (676 max.)";
					
					if (this.alphabetModel3)
					{
						this.alphabetModel2 = true;
						this.ui.alphabetModel2RB.checked = this.alphabetModel2;	
						this.alphabetModel3 = false;
						this.ui.alphabetModel3RB.checked = this.alphabetModel3;					
					}			
					this.ui.alphabetModel3RB.enabled = false;
					
					if (this.alphabetModel1)
					{
						this.updateComboBox(this.ui.startLetter100Combo, this.upperCaseZList);				
						this.updateComboBox(this.ui.startLetter10Combo, this.upperCaseZList);				
						this.ui.startLetter100Combo.enabled = true;		
					}
					else if (this.alphabetModel2)
					{			
						this.updateComboBox(this.ui.startLetter10Combo, this.upperCaseList);	
						this.ui.startLetter100Combo.enabled = false;					
					}		
					this.updateComboBox(this.ui.startLetter1Combo, this.upperCaseList);		
				}
				else
				{
					this.ui.alphabetModel1RB.text = "a, b ... z, za, zb ...   (For Short Seq)";
					this.ui.alphabetModel2RB.text = "Aa, Ab ... Az, Ba, Bb ...  (676 max.)";				
					this.ui.alphabetModel3RB.enabled = true;
					
					if (this.alphabetModel1)
					{
						this.updateComboBox(this.ui.startLetter100Combo, this.lowerCaseZList);				
						this.updateComboBox(this.ui.startLetter10Combo, this.lowerCaseZList);
						this.ui.startLetter100Combo.enabled = true;					
					}
					else if (this.alphabetModel2)
					{
						this.updateComboBox(this.ui.startLetter10Combo, this.upperCaseList);
						if (this.ui.startLetter10Combo.currentIndex == 0)
							this.ui.startLetter10Combo.setCurrentIndex(1);	

						this.ui.startLetter100Combo.enabled = false;					
					}
					else
					{
						this.updateComboBox(this.ui.startLetter10Combo, this.lowerCaseList);	
						if (this.ui.startLetter10Combo.currentIndex == 0)
							this.ui.startLetter10Combo.setCurrentIndex(1);	
	
						this.ui.startLetter100Combo.enabled = false;					
					}					
					this.updateComboBox(this.ui.startLetter1Combo, this.lowerCaseList);		
				}
				
				if (this.ui.startLetter1Combo.currentIndex == 0)
					this.ui.startLetter1Combo.setCurrentIndex(1);
			}	
		}	
	};
	
	
	// list of functions called when user interact
	this.selectionChanged = function()
	{
		this.refreshSelection();
		this.buildPreview();
	};
	this.opRenameRBToggled = function(boolVal)
	{
		this.opRename = boolVal;
		this.buildPreview();		
		this.setAvailability();
	};
	this.opAddTextRBToggled = function(boolVal)
	{
		this.opAddText = boolVal;
		this.buildPreview();	
		this.setAvailability();
	};
	this.opReplaceRBToggled = function(boolVal)
	{
		this.opReplace = boolVal;
		this.buildPreview();		
		this.setAvailability();
	};
	this.findInputEdited = function()
	{
		this.findTx = this.ui.findInput.text;
		this.buildPreview();
	};
	this.newTextInputEdited = function()
	{
		this.newText = this.ui.newTextInput.text;
		this.buildPreview();
	};
	this.prefixRBToggled = function(boolVal)
	{
		this.asPrefix = boolVal;
		this.buildPreview();
	};
	this.suffixRBToggled = function(boolVal)
	{
		this.asSuffix = boolVal;
		this.buildPreview();
	};
	this.numericRBToggled = function(boolVal)
	{
		this.numeric = boolVal;
		this.buildPreview();		
		this.setAvailability();		
	};
	this.startNumBoxValueChanged = function(value)
	{
		this.startNum = value;
		this.buildPreview();			
	};
	this.addLeadZeroCBStateChanged = function(value)
	{
		this.addLeadZero = (value == 2);		
		this.buildPreview();		
		this.setAvailability();
	};
	this.leadZeroDigitComboIndexChanged = function(value)
	{
		this.digit = value;
		this.buildPreview();
	};
	this.alphabetRBToggled = function(boolVal)
	{
		this.alphabet = boolVal;
		this.buildPreview();		
		this.setAvailability();			
	};
	this.upperCaseCBStateChanged = function(value)
	{
		this.upperCase = (value == 2);
		this.buildPreview();		
		this.setAvailability();	
	};
	this.alphabetModel1RBToggled = function(boolVal)
	{	
		this.alphabetModel1 = boolVal;
		this.buildPreview();		
		this.setAvailability();
	};
	this.alphabetModel2RBToggled = function(boolVal)
	{
		this.alphabetModel2 = boolVal;
		this.buildPreview();		
		this.setAvailability();
	};
	this.alphabetModel3RBToggled = function(boolVal)
	{
		this.alphabetModel3 = boolVal;	
		this.buildPreview();		
		this.setAvailability();
	};
	this.startLetter100ComboIndexChanged = function()
	{
		this.char100 = this.ui.startLetter100Combo.currentText;		
		this.buildPreview();		
	};
	this.startLetter10ComboIndexChanged = function()
	{
		this.char10 = this.ui.startLetter10Combo.currentText;	
		this.buildPreview();		
	};
	this.startLetter1ComboIndexChanged = function()
	{
		this.char1 = this.ui.startLetter1Combo.currentText;
		this.buildPreview();		
	};
	this.reverseCBStateChanged = function(value)
	{
		this.reverse = (value == 2);
		this.buildPreview();		
		this.setAvailability();		
	};
	this.keepNewNameRBToggled = function(boolVal)
	{
		this.keepNewName = boolVal;	
		this.buildPreview();
	};
	this.suffixNewNameRBToggled = function(boolVal)
	{
		this.suffixNewName = boolVal;	
		this.buildPreview();
	};
	this.renameButtonReleased = function()
	{
		scene.beginUndoRedoAccum("Batch Rename Cels");
		var renameCount = 0;
		for (var nd = 0; nd < this.nodes.length; nd++)
		{
			if (nd == 0)
				var celInfo = this.firstNodeCelInfo;
			else	
				var celInfo = pf.getCelInfo(this.frameRange, this.nodes[nd]);
				
			celInfo.newName = this.getNewNames(celInfo, celInfo.selected.length);
			renameCount = this.applyNewNames(celInfo, renameCount);
			if (renameCount == -1)
			{
				scene.cancelUndoRedoAccum();
				break;
			}
		}
		scene.endUndoRedoAccum();	
		this.refreshSelection();
	};
	this.closeButtonReleased = function()
	{
		this.savePref();
		if (this.scn !== null)
			this.scn.disconnectAll();
		this.ui.close();	
	};

	
	// load UI
	this.ui = pf.createUI();
	
	/* if software version is 16 or higher, use SCN class to signal when selection is changed.
	else, use QWidget::changeEvent instead */
	var main = this;
	var softwareVer = pf.getSoftwareVer();
	if (softwareVer >= 16)
	{
		this.scn = new SceneChangeNotifier(this.ui);
		this.scn.selectionChanged.connect(this, this.selectionChanged);
	}
	else
	{
		this.ui.changeEvent = function()
		{
			if (!main.ui.isActiveWindow)
			{
				main.ui.previewInput.text = "";
				main.ui.renameButton.enabled = false;
				main.nodes = [];
				main.firstNodeCelInfo = {};
			}
			else
			{
				main.refreshSelection();
				main.buildPreview();				
			}
		};
	}	
	this.ui.closeEvent = function()    // when title bar "x" is clicked
	{
		main.closeButtonReleased();
	};
	
	this.ui.opRenameRB.toggled.connect(this, this.opRenameRBToggled);
	this.ui.opAddTextRB.toggled.connect(this, this.opAddTextRBToggled);
	this.ui.opReplaceRB.toggled.connect(this, this.opReplaceRBToggled);

	this.ui.findInput.textEdited.connect(this, this.findInputEdited);
	this.ui.newTextInput.textEdited.connect(this, this.newTextInputEdited);
	this.ui.prefixRB.toggled.connect(this, this.prefixRBToggled);
	this.ui.suffixRB.toggled.connect(this, this.suffixRBToggled);
	
	this.ui.numericRB.toggled.connect(this, this.numericRBToggled);
	this.ui.startNumBox['valueChanged(int)'].connect(this, this.startNumBoxValueChanged);	
	this.ui.addLeadZeroCB.stateChanged.connect(this, this.addLeadZeroCBStateChanged);
	this.ui.leadZeroDigitCombo['currentIndexChanged(int)'].connect(this, this.leadZeroDigitComboIndexChanged);
	
	this.ui.alphabetRB.toggled.connect(this, this.alphabetRBToggled);		
	this.ui.upperCaseCB.stateChanged.connect(this, this.upperCaseCBStateChanged);
	this.ui.alphabetModel1RB.toggled.connect(this, this.alphabetModel1RBToggled);
	this.ui.alphabetModel2RB.toggled.connect(this, this.alphabetModel2RBToggled);
	this.ui.alphabetModel3RB.toggled.connect(this, this.alphabetModel3RBToggled);
	this.ui.startLetter100Combo['currentIndexChanged(int)'].connect(this, this.startLetter100ComboIndexChanged);
	this.ui.startLetter10Combo['currentIndexChanged(int)'].connect(this, this.startLetter10ComboIndexChanged);
	this.ui.startLetter1Combo['currentIndexChanged(int)'].connect(this, this.startLetter1ComboIndexChanged);
	
	this.ui.reverseCB.stateChanged.connect(this, this.reverseCBStateChanged);
	
	this.ui.keepNewNameRB.toggled.connect(this, this.keepNewNameRBToggled);
	this.ui.suffixNewNameRB.toggled.connect(this, this.suffixNewNameRBToggled);
	
	this.ui.renameButton.released.connect(this, this.renameButtonReleased);
	this.ui.closeButton.released.connect(this, this.closeButtonReleased);

	
	// create list of items for combo box
	this.leadZeroList = ["00", "000", "0000", "00000", "000000", "0000000", "00000000"];
	
	this.lowerCaseZList = ["", "z"]
	
	this.lowerCaseList = ["", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", 
							"n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
	this.upperCaseZList = ["", "Z"]
	
	this.upperCaseList = ["", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
							"N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];		
						
	
	// create samples of new names and also enable/disable rename button after error check
	this.buildPreview = function()
	{
		if (this.nodes.length == 0)
		{
			this.ui.previewInput.text = "Please select drawing node(s).";
			this.ui.renameButton.enabled = false;
			return;
		}
	
		var startLetterIdx = 0;
		var find = pf.removeIllegalLetters(this.findTx);
		var str = pf.removeIllegalLetters(this.newText);		
		var nameIsBlank = false, exceedMaxLimit = false;
		
		// check for errors in new name list first
		if (this.opRename && this.alphabet)
		{
			if (this.alphabetModel2 || this.alphabetModel3)
			{
				startLetterIdx += pf.convertToIdx(this.char100, this.char10, this.char1, "model2");
				var lastItemIdx = startLetterIdx + this.firstNodeCelInfo.selected.length -1;
				if (lastItemIdx > 675)
					exceedMaxLimit = true;				
			}
		}
		else if (this.opReplace && find !== "" && find !== str)
		{					
			var testName = "";
			for (var idx = 0; idx < this.firstNodeCelInfo.selected.length; idx++)
			{
				testName = this.firstNodeCelInfo.selected[idx].replace(find, str);
				if (testName == "")
				{
					nameIsBlank = true;
					break;
				}
			}	
		}	
		if (exceedMaxLimit)
		{
			this.ui.previewInput.text = "Exceeds the limit of this model !";
			this.ui.renameButton.enabled = false;			
		}
		else if (nameIsBlank)
		{
			this.ui.previewInput.text = "New name cannot be blank !";
			this.ui.renameButton.enabled = false;	
		}
		
		
		// get small samples of new names
		else
		{
			var previewLength = 5;
			if (previewLength > this.firstNodeCelInfo.selected.length)
				previewLength = this.firstNodeCelInfo.selected.length;
					
			var sampleNameArray = this.getNewNames(this.firstNodeCelInfo, previewLength);			
			var previewStr = sampleNameArray[0];	
			for (var i=1; i < sampleNameArray.length; i++)
				previewStr += ", " + sampleNameArray[i];

			if (previewLength < this.firstNodeCelInfo.selected.length)
				previewStr += "...";
				
			if (this.nodes.length > 1)
				previewStr += " (Preview of 1st node)"				
		
			this.ui.previewInput.text = previewStr;
			this.ui.renameButton.enabled = true;
		}
	};
	
	
	this.getNewNames = function(celInfo, length)
	{
		var newNameArray = [];
		var find = pf.removeIllegalLetters(this.findTx);
		var str = pf.removeIllegalLetters(this.newText);
		var startLetterIdx = 0;		
			
		if (this.alphabet)
		{		
			if (this.alphabetModel1)				
				startLetterIdx += pf.convertToIdx(this.char100, this.char10, this.char1, "model1");

			else if (this.alphabetModel2 || this.alphabetModel3)
				startLetterIdx += pf.convertToIdx(this.char100, this.char10, this.char1, "model2");				
		}
	
		for (var idx = 0; idx < length; idx++)
		{
			var newName = "";
			var celName = celInfo.selected[idx];
			
			if (this.opRename)
			{
				var subIdx = idx;
				if (this.reverse)
					subIdx = celInfo.selected.length -1 -idx;

				celName = celInfo.selected[subIdx];
				
				var seq = "";
				
				if (this.alphabet)
				{										
					if (this.upperCase)
						this.alphabetModel1?						
							seq += pf.getAlphabet(subIdx +startLetterIdx, "model1", "upper"):
							seq += pf.getAlphabet(subIdx +startLetterIdx, "model2", "upper");	

					else if (this.alphabetModel1) 
						seq += pf.getAlphabet(subIdx +startLetterIdx, "model1", "lower");
					else if (this.alphabetModel2)
						seq += pf.getAlphabet(subIdx +startLetterIdx, "model2", "lower");
					else
						seq += pf.getAlphabet(subIdx +startLetterIdx, "model3", "lower");	
				}
				else
					seq += pf.getNumber(subIdx, this.startNum, this.addLeadZero, this.digit +2);
				
				this.asPrefix? newName += str + seq : newName += seq + str;
			}
			else if (this.opAddText)
				this.asPrefix? newName += str + celName : newName += celName + str;		

			else // this.opReplace == true
			{
				newName = celName;
				if (find !== "" && find !== str)
				{
					var foundIdx = celName.indexOf(find);
					var count = 0;
					while (foundIdx !== -1)
					{
						count++;
						foundIdx = celName.indexOf(find, foundIdx +find.length);					
					}
					for (var co = 0; co < count; co++)
						newName = newName.replace(find, str);
				}
			}
			
			// if "add numbers to the new names" is toggled, add suffix numbers
			if (this.suffixNewName)
				newName = pf.getUniqueName(newName, this.firstNodeCelInfo.excluded);

			newNameArray.push(newName);
		}
		return newNameArray;
	};

	
	this.applyNewNames = function(celInfo, renameCount)
	{
		// remove from list if new name == old name		
		var lg = celInfo.selected.length;	
		for (var i = (lg -1); i >= 0; i--)		
		{
			if (celInfo.selected[i] == celInfo.newName[i])
			{
				celInfo.selected.splice(i, 1);
				celInfo.newName.splice(i, 1);
				celInfo.frame.splice(i, 1);
			}
		}	
		if (celInfo.selected.length == 0)
		{
			this.ui.previewInput.text = "Nothing to rename";
			this.ui.renameButton.enabled = false;
			return renameCount;
		}

		// add temporary suffix to all selected cels first to avoid conflict if proposed name has been used
		for (var idx = 0; idx < celInfo.selected.length; idx++)
		{
			var celName = column.getEntry (celInfo.drawCol, 1, celInfo.frame[idx]);
			var renameSuccess2 = column.renameDrawing(celInfo.drawCol, celName, "tempPrefix_" + celName);
			if (!renameSuccess2)
			{
				this.ui.previewInput.text = "Failed to add temp suffix";
				return -1;	
			}
		}
		
		// rename cels outside selection if "keep the new name" option is chosen
		if (this.keepNewName)
		{
			var newAndExclCels = celInfo.newName.concat(celInfo.excluded);
			
			for (var i = 0; i < celInfo.excluded.length; i++)
			{
				if (celInfo.newName.indexOf(celInfo.excluded[i]) !== -1)
				{
					var suffix = 0;
					var suffixedName = celInfo.excluded[i];

					while (newAndExclCels.indexOf(suffixedName) !== -1)
					{
						suffix ++;
						suffixedName = celInfo.excluded[i] + "_" + suffix;
					}
					var renameSuccess = column.renameDrawing(celInfo.drawCol, celInfo.excluded[i], suffixedName)	
					if (!renameSuccess)
					{
						this.ui.previewInput.text = "Failed to rename excluded cels";
						return -1;
					}
				}
			}
		}		
		
		for (var idx2 = 0; idx2 < celInfo.selected.length; idx2++)
		{
			var celName = column.getEntry (celInfo.drawCol, 1, celInfo.frame[idx2]);
			var renameSuccess3 = column.renameDrawing(celInfo.drawCol, celName, celInfo.newName[idx2]);
			if (!renameSuccess3)
			{
				this.ui.previewInput.text = "Renaming Failed";
				return -1;			
			}
			else
				renameCount++;
		}
		
		this.ui.previewInput.text = "Renamed " + renameCount + " cels";	
		return renameCount;
	};
}







// helper functions
function private_functions()
{	
	this.getCelInfo = function(frameRange, argNode)
	{
		var celInfo = {};		
		var useTiming = node.getAttr(argNode, 1, "drawing.ELEMENT_MODE").boolValue();
		celInfo.drawCol = node.linkedColumn(argNode, useTiming ? "drawing.element" : "drawing.customName.timing");

		celInfo.selected = [], celInfo.frame = [];
		for (var idx = 0; idx < frameRange.length; idx++)
		{
			var curCelName = column.getEntry (celInfo.drawCol, 1, frameRange[idx]);
			if (celInfo.selected.indexOf(curCelName) == -1 && curCelName !== "")
			{
				celInfo.frame.push(frameRange[idx]);
				celInfo.selected.push(curCelName);
			}
		}	

		celInfo.excluded = column.getDrawingTimings(celInfo.drawCol);
		for (var ex = 0; ex < celInfo.excluded.length; ex++)
			if (celInfo.selected.indexOf(celInfo.excluded[ex]) !== -1)
				celInfo.excluded.splice(ex, 1, "");

		celInfo.excluded = celInfo.excluded.filter(Boolean); // this removes empty items
		return celInfo;
	};


	this.getNumber = function(idx, startN, leadZero, digit)
	{
		var string = "" + (idx + startN);
		if (leadZero)
			while (string.length < digit)
				string = "0" + string;

		return string;
	};
	
	
	this.convertToIdx = function(letter1, letter2, letter3, model)
	{
		var letterIdx = 0;
		
		var place100 = "" + letter1;
		var place10 = "" + letter2;
		var place1 = "" + letter3;
		
		place100 = place100.toLowerCase();
		place10 = place10.toLowerCase();
		place1 = place1.toLowerCase();
		
		if (place1 == "")
			place1 = "a";

		if (model == "model1")
		{			
			place100 = place100.charCodeAt(0) -96;
			place10 = place10.charCodeAt(0) -96;
			place1 = place1.charCodeAt(0) -97;	
		
			if (!isNaN(place100))
				letterIdx += place100;

			if (!isNaN(place10))
				letterIdx += place10;

			letterIdx += place1;
		}
		else
		{
			if (place10 == "")
				place10 = "a";

			place10 = place10.charCodeAt(0) -97;
			place1 = place1.charCodeAt(0) -97;		
		
			if (!isNaN(place10))
			{
				place10 *= 26;	
				letterIdx += place10;
			}			
			letterIdx += place1;
		}
		return letterIdx;
	};
	
	
	this.getAlphabet = function(idx, model, letterCase)
	{
		var num = idx %26 + 97;     // add 97 to adjust char code so a == 0;
		var place = Math.floor(idx /26);
		var prefix = "";
		
		if (model == "model1")
			for (var i = 0; i< place; i++)
				prefix += "z";

		else if (model == "model2")
		{
			var p = String.fromCharCode(place + 97);
			prefix += p.toUpperCase();
		}
		else
			prefix += String.fromCharCode(place + 97);
		
	
		var newAlphabet = prefix + String.fromCharCode(num);
		
		if (letterCase == "upper")
			return newAlphabet.toUpperCase();
		else
			return newAlphabet;			
	};
	
	
	this.getUniqueName = function(argName, excludedCels)
	{
		var suffix = 0;
		var originalName = argName;
		
		while (excludedCels.indexOf(argName) !== -1)
		{
			suffix ++;
			argName = originalName + "_" + suffix;
		}
	
		return argName;
	};
	
	
	this.removeIllegalLetters = function(str)
	{
		var letterList = ["~", "`", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "=",
						"[", "]", "{", "}", "\\", "|", ":", ";", "\'", "\"", "<", ">", "/", "?", " "];
		
		for (var idx in letterList)
			while ( str.indexOf(letterList[idx]) !== -1)
				str = str.replace(letterList[idx], "");

		return str;
	};
	
	
	this.getSoftwareVer = function()
	{
		var info = about.getVersionInfoStr();
		info = info.split(" ");
		return parseFloat(info[7]);
	};
	
	
	this.getParentWidget = function()
	{
		var topWidgets = QApplication.topLevelWidgets();
		for (var i in topWidgets)
			if (topWidgets[i] instanceof QMainWindow && !topWidgets[i].parentWidget())
				return topWidgets[i];
		return "";
	};
	
	
	this.createUI = function()
	{
		this.dialog = new QWidget(this.getParentWidget());
		this.dialog.setWindowTitle("Batch Rename Cels v" + scriptVer);	
		this.dialog.setWindowFlags(Qt.Tool);
		this.dialog.setAttribute(Qt.WA_DeleteOnClose);		
		this.dialog.setGeometry (511, 522, 300, 200);		
		this.dialog.focusPolicy = Qt.StrongFocus;
		this.dialog.setFocus(true);
		this.dialog.mouseTracking = true;	
		
		this.dialog.mainLayout = new QVBoxLayout(this.dialog);
		this.dialog.opLayout = new QHBoxLayout(this.dialog);
		this.dialog.textLayout = new QHBoxLayout(this.dialog);
		this.dialog.textLLayout = new QFormLayout(this.dialog);
		this.dialog.textRLayout = new QVBoxLayout(this.dialog);	
		this.dialog.seqLayout = new QGridLayout(this.dialog);
		this.dialog.numLayout = new QVBoxLayout(this.dialog);
		this.dialog.numSubLayout = new QGridLayout(this.dialog);	
		this.dialog.alphaLayout = new QVBoxLayout(this.dialog);	
		this.dialog.alphaTopLayout = new QHBoxLayout(this.dialog);
		this.dialog.alphaBtmLayout = new QHBoxLayout(this.dialog);
		this.dialog.alphaComboLayout = new QHBoxLayout(this.dialog);	
		
		this.dialog.nsLayout = new QVBoxLayout(this.dialog);
		this.dialog.nsSubLayout = new QHBoxLayout(this.dialog);	
		this.dialog.bottomLayout = new QHBoxLayout(this.dialog);	
		
		this.dialog.opBox = new QGroupBox("Operation Type");
		this.dialog.opBox.setLayout(this.dialog.opLayout);
		this.dialog.opBox.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Fixed);
		this.dialog.mainLayout.addWidget(this.dialog.opBox, 0, 0);
			
		this.dialog.opRenameRB = new QRadioButton("Sequence Rename");
		this.dialog.opLayout.addWidget(this.dialog.opRenameRB, 0, 0);

		this.dialog.opAddTextRB = new QRadioButton("Add New Text");		
		this.dialog.opLayout.addWidget(this.dialog.opAddTextRB, 0, 0);

		this.dialog.opReplaceRB = new QRadioButton("Replace / Delete Text");	
		this.dialog.opLayout.addWidget(this.dialog.opReplaceRB, 0, 0);

		this.dialog.textLayout.setSpacing(15);	
		this.dialog.textBox = new QGroupBox("Text");
		this.dialog.textBox.setLayout(this.dialog.textLayout);
		this.dialog.textBox.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Fixed);	
		this.dialog.mainLayout.addWidget(this.dialog.textBox, 0, 0);	
		
		this.dialog.textLayout.addLayout(this.dialog.textLLayout);	
		this.dialog.textLayout.addLayout(this.dialog.textRLayout);
		
		this.dialog.findInput_label = new QLabel("Find:");	
		this.dialog.findInput = new QLineEdit();	
		this.dialog.findInput.setMinimumSize(211, 31);
		this.dialog.textLLayout.addRow(this.dialog.findInput_label, this.dialog.findInput);	

		this.dialog.newTextInput_label = new QLabel("New Text:");
		this.dialog.newTextInput = new QLineEdit();	
		this.dialog.newTextInput.setMinimumSize(211, 31);	
		this.dialog.textLLayout.addRow(this.dialog.newTextInput_label, this.dialog.newTextInput);			

		this.dialog.prefixRB_label = new QLabel("Order:");		
		this.dialog.textRLayout.addWidget(this.dialog.prefixRB_label, 0, 0);	
		
		this.dialog.prefixRB = new QRadioButton("Text + Sequential Characters");		
		this.dialog.textRLayout.addWidget(this.dialog.prefixRB, 0, 0);

		this.dialog.suffixRB = new QRadioButton("Sequential Characters + Text");	
		this.dialog.textRLayout.addWidget(this.dialog.suffixRB, 0, 0);		

		this.dialog.seqBox = new QGroupBox("Sequential Characters");
		this.dialog.seqBox.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Fixed);	
		this.dialog.seqBox.setLayout(this.dialog.seqLayout);

		this.dialog.mainLayout.addWidget(this.dialog.seqBox, 0, 0);
		
		this.dialog.numericRB = new QRadioButton("Numerical");		
		this.dialog.seqLayout.addWidget(this.dialog.numericRB, 0, 0);

		this.dialog.alphabetRB = new QRadioButton("Alphabetical");	
		this.dialog.seqLayout.addWidget(this.dialog.alphabetRB, 0, 1);		

		this.dialog.seqLayout.addLayout(this.dialog.numLayout, 1, 0);
		
		this.dialog.numBox = new QGroupBox("Numerical Options");
		this.dialog.numBox.setLayout(this.dialog.numSubLayout);		
		this.dialog.numLayout.addWidget(this.dialog.numBox, 0, 0);
			
		this.dialog.startNumBox_label = new QLabel("Start Number:");
		this.dialog.numSubLayout.addWidget(this.dialog.startNumBox_label, 0, 0);
		
		this.dialog.startNumBox = new QSpinBox();		
		this.dialog.numSubLayout.addWidget(this.dialog.startNumBox, 0, 1);	
		
		this.dialog.addLeadZeroCB = new QCheckBox("Lead Zero");
		this.dialog.numSubLayout.addWidget(this.dialog.addLeadZeroCB, 1, 0);		

		this.dialog.leadZeroDigitCombo_label = new QLabel("Digit:");
		this.dialog.numSubLayout.addWidget(this.dialog.leadZeroDigitCombo_label, 2, 0);
		
		this.dialog.leadZeroDigitCombo = new QComboBox();	
		this.dialog.numSubLayout.addWidget(this.dialog.leadZeroDigitCombo, 2, 1);		

		this.dialog.reverseCB = new QCheckBox("Reversed Sequence");	
		this.dialog.numLayout.addWidget(this.dialog.reverseCB, 0, 0);			

		this.dialog.alphaBox = new QGroupBox("Alphabetical Options");
		this.dialog.alphaBox.setLayout(this.dialog.alphaLayout);		
		this.dialog.seqLayout.addWidget(this.dialog.alphaBox, 1, 1);	
		
		this.dialog.alphaLayout.addLayout(this.dialog.alphaTopLayout);	
		
		this.dialog.upperCaseCB_label = new QLabel("Model:");
		this.dialog.alphaTopLayout.addWidget(this.dialog.upperCaseCB_label, 0, 0);	
		
		this.dialog.upperCaseCB = new QCheckBox("Upper Case");
		this.dialog.alphaTopLayout.addWidget(this.dialog.upperCaseCB, 0, 0);

		this.dialog.alphabetModel1RB = new QRadioButton("a, b ... z, za, zb ...   (For Short Seq)");
		this.dialog.alphaLayout.addWidget(this.dialog.alphabetModel1RB, 1, 0);

		this.dialog.alphabetModel2RB = new QRadioButton("Aa, Ab ... Az, Ba, Bb ...  (676 max.)");	
		this.dialog.alphaLayout.addWidget(this.dialog.alphabetModel2RB, 1, 0);

		this.dialog.alphabetModel3RB = new QRadioButton("aa, ab ... az, ba, bb ...   (676 max.)");		
		this.dialog.alphaLayout.addWidget(this.dialog.alphabetModel3RB, 1, 0);	
		
		this.dialog.alphaLayout.addLayout(this.dialog.alphaBtmLayout);	
		
		this.dialog.startLetterCombo_label = new QLabel("Start Letter:");
		this.dialog.alphaBtmLayout.addWidget(this.dialog.startLetterCombo_label, 0, 0);

		this.dialog.alphaBtmLayout.addLayout(this.dialog.alphaComboLayout);
		this.dialog.alphaComboLayout.setSpacing(0);
		
		this.dialog.startLetter100Combo = new QComboBox();
		this.dialog.startLetter10Combo = new QComboBox();
		this.dialog.startLetter1Combo = new QComboBox();
		this.dialog.startLetter100Combo.setMaximumSize(41, 21);
		this.dialog.startLetter10Combo.setMaximumSize(41, 21);
		this.dialog.startLetter1Combo.setMaximumSize(41, 21);
		this.dialog.startLetter100Combo.maxVisibleItems = 10;
		this.dialog.startLetter10Combo.maxVisibleItems = 10;
		this.dialog.startLetter1Combo.maxVisibleItems = 10;	
		this.dialog.alphaComboLayout.addWidget(this.dialog.startLetter100Combo, 0, 0);	
		this.dialog.alphaComboLayout.addWidget(this.dialog.startLetter10Combo, 0, 0);	
		this.dialog.alphaComboLayout.addWidget(this.dialog.startLetter1Combo, 0, 0);	
		
		this.dialog.nsBox = new QGroupBox("Namespace");
		this.dialog.nsBox.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Fixed);	
		this.dialog.nsBox.setLayout(this.dialog.nsLayout);		
		this.dialog.mainLayout.addWidget(this.dialog.nsBox, 0, 0);
		
		this.dialog.namespaceBox_label = new QLabel("When new names are taken by cels outside the selection...");		
		this.dialog.nsLayout.addWidget(this.dialog.namespaceBox_label, 0, 0);
		
		this.dialog.nsLayout.addLayout(this.dialog.nsSubLayout);
		
		this.dialog.keepNewNameRB = new QRadioButton("Keep new names, add numbers to excluded cels");		
		this.dialog.nsSubLayout.addWidget(this.dialog.keepNewNameRB, 1, 0);

		this.dialog.suffixNewNameRB = new QRadioButton("Add numbers to new names");	
		this.dialog.nsSubLayout.addWidget(this.dialog.suffixNewNameRB, 1, 1);	

		this.dialog.bottomLayout.setSpacing(20);	
		this.dialog.previewInput = new QLineEdit();
		this.dialog.previewInput.setMinimumSize(271, 41);	
		this.dialog.previewInput.setStyleSheet("QLineEdit{font-size: 11pt;};");
		this.dialog.previewInput.alignment = Qt.AlignCenter;
		this.dialog.previewInput.readOnly = true;
		this.dialog.bottomLayout.addWidget(this.dialog.previewInput, 4, 0);
		
		this.dialog.renameButton = new QPushButton("Rename");
		this.dialog.bottomLayout.addWidget(this.dialog.renameButton, 0, 0);
		
		this.dialog.closeButton = new QPushButton("Close");
		this.dialog.bottomLayout.addWidget(this.dialog.closeButton, 0, 0);

		this.dialog.mainLayout.addLayout(this.dialog.bottomLayout);
		
		return this.dialog;
	};
}