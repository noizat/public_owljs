var {OWL} = require("owl");
var {OWLFrame} = require("owl/owlframe"); 
importPackage(java.io);
importPackage(Packages.org.semanticweb.owlapi.model);
importPackage(Packages.org.semanticweb.owlapi.io);
importPackage(org.semanticweb.owlapi.apibinding);
importPackage(org.obolibrary.macro);
importPackage(Packages.com.google.gson);

/*

  Namespace: repl

  Functions designed to be used within a repl or quick-scripting environment
*/

/*
  Exported variables:
*/
  
/* Variable: o
 * maps safe-labels to classes, properties and other objects. See <setClassVars>
 */
var o = exports.o = {};

/* Variable: labelToIRIMap
 * maps full labels to IRIs
 */
var labelToIRIMap = exports.labelToIRIMap = {};

/* Variable: owl
 * An <OWL> object
 */
var owl = exports.owl = owl;

/* Variable: obj
 * The current object
 */
var obj = exports.obj = { x : 1};

// ========================================
// INIT
// ========================================

exports.createOntology = function(iri) { 
    owl = new OWL();
    owl.createOntology(iri);
    return owl;
}

exports.loadowl = function(file, isUseCatalog) { 
    owl = new OWL();
    if (isUseCatalog) {
        owl.addCatalog();
    }
    owl.loadOntology(file);
    owl.config.defaultFile = file;
    setClassVars();
    return owl;
};

exports.owlinit = function(newOwl) { owl=newOwl; setClassVars() };

var setObj = exports.setObj = function(x) { obj = x };
var getObj = exports.getObj = function() { return obj };

// ========================================
// CONVENIENCE
// ========================================

// Function: ont
// Calls: <OWL.getOntology>
var ont = exports.ont = function() { return owl.getOntology() };

// Function: reasoner
// Calls: <OWL.getReasoner>
exports.reasoner = function() { return owl.getReasoner() };

// Function: df
// Calls: <OWL.getOWLDataFactory>
exports.df = function() { return owl.getOWLDataFactory() };

// Function: mgr
// Calls: <OWL.getOWLManager>
exports.mgr = function() { return owl.getOWLManager() };

// Function: log
// Calls: <OWL.log>
var log = exports.log = function(x) { return owl.log(x) };

// ========================================
// SYNTAX
// ========================================

exports.And = " and ";
exports.Or = " or ";
exports.Some = " some ";
exports.Only = " only ";
exports.omn = function(exprStr) {
    var mst = new ManchesterSyntaxTool(ont(), null, true);
    return mst.parseManchesterExpression(exprStr);
};


// ========================================
// FACTORY FUNCTIONS
// ========================================

exports.someValuesFrom = function() {return owl.someValuesFrom.apply(owl,arguments)};
exports.intersectionOf = function() {return owl.intersectionOf.apply(owl,arguments)};
exports.subClassOf = function() {return owl.subClassOf.apply(owl,arguments)};
exports.disjointUnion = function() {return owl.disjointUnion.apply(owl,arguments)};
exports.classAssertion = function() {return owl.classAssertion.apply(owl,arguments)};
exports.equivalentClasses = function() {return owl.equivalentClasses.apply(owl,arguments)};
exports.disjointClasses = function() {return owl.disjointClasses.apply(owl,arguments)};
exports.annotationAssertion = function() {return owl.annotationAssertion.apply(owl,arguments)};
exports.labelAssertion = function() {return owl.labelAssertion.apply(owl,arguments)};
exports.ann = function() {return owl.ann.apply(owl,arguments)};
exports.literal = function() {return owl.literal.apply(owl,arguments)};

// ========================================
// EDITING
// ========================================
var mkClass = exports.mkClass = function(args) { 
    if (typeof args == 'string') {
        args = { label: args };
    }
    if (args instanceof OWLClass) {
        return args;
    }
    var fr = new OWLFrame(owl, args); 
    console.log("Frame = "+fr);
    setObj(fr);
    fr.stamp();
    owl.add(fr);
    var c = fr.getOWLClass() ;
    setClassVar(c);
    return c;
};

exports.mkDisjointUnion = function(c, subclasses) {
    var sobjs = subclasses.map(mkClass);
    var ax = owl.disjointUnion( mkClass(c),  sobjs);
    owl.add(ax);
    return ax;
}

// ========================================
// CHANGES
// ========================================

exports.add = function add(obj) { return owl.add(obj)};
exports.addAxiom = function add(obj) { return owl.addAxiom(obj)};
exports.removeAxiom = function add(obj) { return owl.removeAxiom(obj)};
exports.applyChange = function add(obj) { return owl.applyChange(obj)};

function expandMacros() {
    var mev = new MacroExpansionVisitor(owl.getOntology());
    mev.expandAll();
    mev.dispose();
}
exports.expandMacros = expandMacros;

// deprecated
function saveAxioms(obj, file, owlFormat) {
    var tmpOnt = owl.getManager().createOntology(IRI.create("http://x.org#")); // TODO
    var axioms = obj;
    if (obj instanceof bbop.owl.OWLFrame) {
        axioms = obj.toAxioms();
    }
    for (var k in axioms) {
        owl.getManager().addAxiom(tmpOnt, axioms[k]);
    }
    var pw = new ParserWrapper();
    if (owlFormat == null) {
        owlFormat = new org.coode.owlapi.obo.parser.OBOOntologyFormat();
    }
    pw.saveOWL(tmpOnt, owlFormat, file, g());
    owl.getManager().removeOntology(tmpOnt);
}

// this is temporary until we resolve ringo vs rhino differences
function javaString(s) {
    if (s == null) {
        return null;
    }
    if (s.replaceAll != null) {
        return s;
    }
    return new java.lang.String(s);
}

// ========================================
// OWL MANIPULATION
// ========================================

/* Function: setClassVars
 *
 * Initializes <o> map
 *
 * for every class C in O, where C has a label L, set
 * > o.L' = C
 *
 * where L' is a "safeified" version of L (ie valid js symbol),
 * with spaces turned to underscores and invalid characters removed
 *
 * Note that this is particularly useful in a REPL. A user can
 * type "o.epi<TAB>" and is offered options such as "epithlium" or "epiblast"
 *
 */
var setClassVars = exports.setClassVars = function () {
    var objs = owl.getAllObjects();
    for (var k=0; k<objs.length; k++) {
        var obj = objs[k];
        setClassVar(obj);
    }
}

function setClassVar(obj) {
    if (owl.isDeprecated(obj)) {
        return;
    }
    var label = getClassVariableName(obj);
    // no clobber
    while (this[label] != null || isReserved(label)) {
        print("Remapping "+label +" --> _" + label+" ( current value = "+this[label]+" )");
        label = '_'.label;
    }
    if (label != null) {
        //eval("o."+label+" = obj");
        o[label] = obj;
    }
}

function getPrefixedClassVariableName(obj) {
    var n = getClassVariableName(obj);
    if (n != null) {
        return "o."+n;
    }
    return n;
}

// translate an OWLObject into a variable name can point to the object
function getClassVariableName(obj) {
    var label = owl.getLabel(obj);
    label = javaString(label); // TODO
    if (label == null && obj.getIRI != null) {
        var iri = obj.getIRI();
        if (iri != null) {
            label = iri.toString();
            label = javaString(label); // TODO
            if (label.contains("#")) {
                label = label.replaceAll(".*#","");
            }
            else if (label.contains("/")) {
                label = label.replaceAll(".*/","");
            }
        }
    }
    if (label != null) {
        label = safeify(label);
    }
    labelToIRIMap[label] = obj;
    return label;
}

// make the label safe to use as a js keyword;
// this effectively allows us to write:
// > o.LABEL
// in js, as opposed to
// > o["LABEL"]
function safeify(label) {
    label = javaString(label);
    label = label.replaceAll("\\W", "_");
    var c1 = label.substr(0,1);
    if (c1 >= '0' && c1 <= '9') {
        label = "_"+label;
    }
    return label;
}

function isReserved(s) {
    if (s == 'id') { return true };
    if (s == 'SubClassOf') { return true };
    if (s == 'EquivalentTo') { return true };
    return false;
}

var pp = exports.pp = function(object, embedded) { 
    print(render(object, 0, embedded));
}

var render = exports.render = function(object, depth, embedded) {
    // for OWLFrames, only show the slotMap
    if (object == null) {
        return "null";
    }
    if (object.isFrame != null) {
        return render(object.slotMap, depth, embedded);
    }
    typeof(depth) == "number" || (depth = 0)
    typeof(embedded) == "boolean" || (embedded = false)
    var newline = false
    var spacer = function(depth) { var spaces = ""; for (var i=0;i<depth;i++) { spaces += "  "}; return spaces }
    var pretty = ""
    if (      typeof(object) == "undefined" ) { pretty += "undefined" }
    else if ( typeof(object) == "boolean" || 
              typeof(object) == "number" ) {    pretty += object.toString() } 
    else if ( typeof(object) == "string" ) {    pretty += quote(object) }
    else if ( object instanceof String ) {    pretty += quote(object) }
    else if (        object  == null) {         pretty += "null" } 
    else if ( object instanceof(Array) ) {
        if ( object.length > 0 ) {
            if (embedded) { newline = true }
            var content = ""
            for each (var item in object) { content += render(item, depth+1) + ",\n" + spacer(depth+1) }
            content = content.replace(/,\n\s*$/, "").replace(/^\s*/,"")
            pretty += "[ " + content + "\n" + spacer(depth) + "]"
        } else { pretty += "[]" }
    } 
    else if (typeof(object) == "object") {
        if (object instanceof OWLObject) {
            
            if (object instanceof OWLNamedObject) {
                pretty += getPrefixedClassVariableName(object); // TODO
            }
            else if (object instanceof OWLObjectSomeValuesFrom) {
                pretty += "someValuesFrom(" + render(object.getProperty()) +" , " + render(object.getFiller())+") ";
            }
            else if (object instanceof OWLAnnotation) {
                pretty += "ann(" + render(object.getProperty()) +" , " + render(object.getValue())+") ";
            }
            else if (object instanceof OWLLiteral) {                
                pretty += quote(object.getLiteral()); // TODO
            }
            else if (object instanceof OWLObjectIntersectionOf) {
                var args = object.getOperandsAsList().toArray();
                var args2 = args.map(function(x){ return render(x, depth, embedded)})
                pretty += "intersectionOf(" + args2.join(", ") + ")";
            }
            else {
                // TODO
                pretty += object.toString();
            }
        }
        else if (object instanceof java.lang.Object) {
            pretty += object;
        }      
        // TODO Object.keys() not in distributed rhino?
        else if ( !(Object.keys) || Object.keys(object).length > 0 ){
            if (embedded) { newline = true }
            var content = ""
            for (var key in object) { 
                var keyStr = key.toString();
                if (keyStr.indexOf("http:")) {
                    //print("LOOKUP: "+key);
                    keyStr = getPrefixedClassVariableName(IRI.create(key)); // TODO
                    if (keyStr == null) {
                        keyStr = key.toString();
                    }
                }
                log(key + " = " + object[key] + " ; " + typeof object[key]);
                content += spacer(depth + 1) + keyStr + ": " + render(object[key], depth+2, true) + ",\n" 
                //content += spacer(depth + 1) + keyStr + ": " + render(key, depth+2, true) + ",\n" 
            }
            content = content.replace(/,\n\s*$/, "").replace(/^\s*/,"")
            pretty += "{ " + content + "\n" + spacer(depth) + "}"
        } 
        else { pretty += "{}"}
    }
    else { pretty += object.toString() }
    return ((newline ? "\n" + spacer(depth) : "") + pretty)
}

function quote(s) { 
    return "\"" + s + "\"";
}

// ----------------------------------------
// Runner commands
// ----------------------------------------
// OWLTools-Runner required

importPackage(Packages.owltools.cli);
importPackage(Packages.owltools.graph);

var runner;

// executes commands using owltools command line syntax.
// E.g.
//   x("-a limb"); // ancestors of limbs
//   x("foo.owl"); // loads foo.owl in graph wrapper
exports.x = function(args) {
    if (runner == null) {
        log("initializing runner");
        initRunner();
    }
    runner.run(args.split(" "));
}

// initializes runner with new CommandRunner
var initRunner = exports.initRunner = function() {
    runner = new Sim2CommandRunner();
    runner.exitOnException = false;
    runner.isDisposeReasonerOnExit = false;
    if (owl.getOntology() != null) {
        log("Using existing owl.ontology");
        runner.g = new OWLGraphWrapper(owl.getOntology());
    }
}

print("REPL enabled, all systems go!");