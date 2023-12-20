// Toolbar Button
const fs = require("fs");
const path = require("path");

var $button = $("<a id='toolbar-model-gen' href='#' title='Generate Model'></a>")

const FILE_FILTERS = [
  {name: 'Model Files', extensions: ['json']},
  {name: 'All Files', extensions: ['*']}
]

//-------------------------------------
function init () {
  // Toolbar Button
  $('#toolbar .buttons').append($button)
  $button.click(function () {
    app.commands.execute('model-gen:generate')
  })

  //-------------------------------------
  function generateModel() {

    let project = app.project.getProject()

    //Top level models are named after the applications
    //All packages must be directly under the top level models
    project.ownedElements.forEach(appModel =>{ 
      let modelRoot = { 
        name: appModel.name, 
      }
      processElementRec(appModel, modelRoot)
      let filename = app.dialogs.showSaveDialog('Export model', appModel.name+'.model.json', FILE_FILTERS)
      fs.writeFileSync(filename, JSON.stringify(modelRoot, null, 2))
    })
  }

  //-------------------------------------
  function processElementRec(elem, parentElem){
    elem.ownedElements.forEach(e => {

      let umlType = e.constructor.name

      switch(umlType){

        case 'UMLPackage': 

          if(!parentElem.packages){
            parentElem.packages = []
          }
          let pkg = {'id': e._id, 'name': e.name}
          pkg.stereotypes = e.stereotype? e.stereotype.split(',') : []
          pkg.documentation = e.documentation

          processElementRec(e, pkg)
          parentElem.packages.push(pkg)
          break;

        case 'UMLClass':
          if(!parentElem.classes){
            parentElem.classes = []
          }
          let cls = {'id': e._id, 'name': e.name}
          cls.stereotypes = e.stereotype? e.stereotype.split(','): []

          cls.isAbstract = e.isAbstract
          if(e.attributes.length > 0){
            cls.attributes = []
            e.attributes.forEach(a => {

              let attr = {
                'name':a.name, 
                'multiplicity': a.multiplicity,
                'isDerived': a.isDerived,
                'documentation': a.documentation
              }

              if(a.type.constructor.name == 'UMLClass'){
                attr.type = a.type.name
                attr.classId = a.type._id    
              }
              else {
                attr.type = a.type
              }

              cls.attributes.push(attr)
            });
          }

          if(e.operations.length > 0){
            cls.operations = []
            e.operations.forEach(o => {

              let op = {
                'name': o.name,
                'params': [],
                'stereotypes': o.stereotype?  o.stereotype.split(',') : []
              }

              o.parameters.forEach(p => {
                if(p.direction == 'return'){
                  op.returnType = p.type    
                }
                else {
                  let param = {
                    'name': p.name,
                    'type': p.type
                  }
                  op.params.push(param)
                }
              })

              cls.operations.push(op)
            })
          }

          cls.documentation = e.documentation
          processElementRec(e, cls)
          parentElem.classes.push(cls)

          break;
        
        case 'UMLAssociation':
          if(!parentElem.associations){
            parentElem.associations = []
          }

          let assoc = {
            'name': e.name,
            'end1': {
              'name': e.end1.name, 
              'multiplicity': e.end1.multiplicity, 
              'isNavigable': e.end1.navigable, 
              'type': e.end1.reference.name,
              'classId': e.end1.reference._id,
              'isDerived': e.end1.isDerived,
              'isOrdered': e.end1.isOrdered,
              'documentation': e.end1.documentation
            },
            'end2': {
              'name': e.end2.name, 
              'multiplicity': e.end2.multiplicity, 
              'isNavigable': e.end2.navigable, 
              'type': e.end2.reference.name,
              'classId': e.end2.reference._id,
              'isDerived': e.end2.isDerived,
              'isOrdered': e.end2.isOrdered,
              'documentation': e.end2.documentation
            }
          }
          processElementRec(e, assoc)
          parentElem.associations.push(assoc)
          break;

        case 'UMLGeneralization':
          if(!parentElem.extends){
            parentElem.extends = { 
              'type': e.target.name, 
              'classId': e.target._id, 
              'discriminator': e.discriminator 
            }
          }
          break;  
        
        case 'UMLInterfaceRealization':
          if(!parentElem.implements){
            parentElem.implements = []
            parentElem.implements.push({ 
              'type': e.target.name, 
              'classId': e.target._id, 
            })
          }
          break;    
      }
    });
  }

//-------------------------------------
  app.commands.register('model-gen:generate', generateModel)
}

exports.init = init
