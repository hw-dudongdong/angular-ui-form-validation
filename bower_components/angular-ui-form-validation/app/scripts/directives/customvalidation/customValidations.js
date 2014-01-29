angular_ui_form_validations = (function(){
    
    var customValidations, createValidationFormatterLink, customValidationsModule, getValidationPriorityIndex, getValidationAttributeValue,
        getValidatorByAttribute, getCustomTemplate, customTemplates, isCurrentlyDisplayingAnErrorMessageInATemplate,
        currentlyDisplayedTemplate, dynamicallyDefinedValidation;        

    customTemplates = [];

    customValidations = [];

    dynamicallyDefinedValidation = {
        customValidationAttribute: 'validationDynamicallyDefined',
        errorCount: 0,
        _errorMessage: 'Field is invalid',
        errorMessage: function () { return dynamicallyDefinedValidation._errorMessage; },
        validator: function (errorMessageElement, val, attr, element, model, modelCtrl, scope) {
            var valid, i, validation;            

            for(i = 0; i < scope[attr].length; i++ ){
                validation = scope[attr][i];
                valid = validation.validator.apply(scope, arguments);
                dynamicallyDefinedValidation._errorMessage = validation.errorMessage;     
                if(valid === false){
                    dynamicallyDefinedValidation.errorCount++;
                    break;
                }                
            };
            
            return valid;
        }
    };    

    isCurrentlyDisplayingAnErrorMessageInATemplate = function (inputElement) {
        var isCurrentlyDisplayingAnErrorMessageInATemplate = false;
        angular.forEach(customTemplates, function (template){
            if(template.parent().is(inputElement.parents('form'))){
                isCurrentlyDisplayingAnErrorMessageInATemplate = true;  
                currentlyDisplayedTemplate = template;
            }
        });
        return isCurrentlyDisplayingAnErrorMessageInATemplate;
    }

    getValidationAttributeValue = function (attr) {
        var value, property;

        property = property || 'value';

        value = attr;

        try{
            value = JSOL.parse(attr)[property];
        } catch (e) {
        }

        return value || attr;
    };

    getCustomTemplate = function (attr, templateRetriever, $q) {
        var deferred, templateUrl, promise;

        deferred = $q.defer();

        promise = deferred.promise;

        try{
            templateUrl = JSOL.parse(attr)['template'];
            if(templateUrl === undefined || templateUrl === null || templateUrl === '') {
                deferred.reject('No template url specified.');                
            } else {
                promise = templateRetriever.getTemplate(templateUrl);
            }

        } catch (e) {
            deferred.reject('Error retrieving custom error template: ' + e);
        }

        return promise;
    };
    
    getValidatorByAttribute = function (customValidationAttribute) {
        var validator;
        angular.forEach(customValidations, function (validation, idx) {
            if(validation.customValidationAttribute === customValidationAttribute){
                validator = validation.validator;
            }
        });
        return validator;
    };

    getValidationPriorityIndex = function (customValidationAttribute) {
        var index;
        angular.forEach(customValidations, function (validation, idx) {
            if(validation.customValidationAttribute === customValidationAttribute){
                index = idx;
            }
        });
        return index;
    };

    createValidationFormatterLink = function (formatterArgs, templateRetriever, $q, $timeout, $log) {
        
        return function($scope, $element, $attrs, ngModelController) {
            var errorMessage, errorMessageElement, modelName, model, propertyName, runCustomValidations, validationAttributeValue, customErrorTemplate;
            $timeout(function() {
                validationAttributeValue = getValidationAttributeValue($attrs[formatterArgs.customValidationAttribute]);

                if (validationAttributeValue && validationAttributeValue !== 'undefined' && validationAttributeValue !== 'false' ) {
                    modelName = $attrs.ngModel.substring(0, $attrs.ngModel.indexOf('.'));
                    propertyName = $attrs.ngModel.substring($attrs.ngModel.indexOf('.') + 1);
                    model = $scope[modelName];

                    if(typeof(formatterArgs.errorMessage) === 'function'){
                        errorMessage = formatterArgs.errorMessage(validationAttributeValue);
                    } else {
                        errorMessage = formatterArgs.errorMessage;
                    }                    
                    
                    errorMessageElement = angular.element(
                        '<span data-custom-validation-priorityIndex='+ getValidationPriorityIndex(formatterArgs.customValidationAttribute) +
                        ' data-custom-validation-attribute='+ formatterArgs.customValidationAttribute +
                        ' data-custom-field-name='+ $element.attr('name') +
                        ' class="CustomValidationError '+ formatterArgs.customValidationAttribute + ' '+ propertyName +'property">' +
                        errorMessage + '</span>');

                    if(formatterArgs.customValidationAttribute === 'validationDynamicallyDefined') {
                        $scope.$watch(function(){ return dynamicallyDefinedValidation.errorCount; }, function () {
                            errorMessageElement.html(dynamicallyDefinedValidation.errorMessage());
                        });
                    }
                    
                    $element.after(errorMessageElement);
                    errorMessageElement.hide();
                    
                    getCustomTemplate($attrs[formatterArgs.customValidationAttribute], templateRetriever, $q).then(function (template) {
                        var errorMessageToggled;
                        customErrorTemplate = angular.element(template);
                        customErrorTemplate.html('');
                        errorMessageToggled = function () {
                            if(errorMessageElement.css('display') === 'inline' || errorMessageElement.css('display') === 'block') {
                                $log.log('error showing');
                                errorMessageElement.wrap(customErrorTemplate);
                                customTemplates.push(angular.element(errorMessageElement.parents()[0]));
                            } else {
                                $log.log('error NOT showing');
                                if(errorMessageElement.parent().is('.' + customErrorTemplate.attr('class'))){
                                    errorMessageElement.unwrap(customErrorTemplate);
                                }
                            }
                        };

                        $scope.$watch(function (){
                            return errorMessageElement.css('display');
                        }, errorMessageToggled);     
                        $scope.$on('errorMessageToggled', errorMessageToggled);            
                    });

                    if (formatterArgs.customValidationAttribute === 'validationNoSpace') {
                        $element.keyup(function (event){
                            if (event.keyCode === 8) {
                                model[propertyName] = ($element.val().trimRight());
                            }
                        });
                    }

                    if (formatterArgs.customValidationAttribute === 'validationConfirmPassword') {
                        $element.add('[name=password]').on('keyup blur', function (){
                            var passwordMatch, confirmPasswordElement, passwordElement, confirmPasswordIsDirty, passwordIsValid;     

                            confirmPasswordElement = 
                                this.name === 'confirmPassword'? angular.element(this) : angular.element(this).siblings('[name=confirmPassword]'); 

                            passwordElement = confirmPasswordElement.siblings('[name=password]');

                            confirmPasswordIsDirty = /dirty/.test(confirmPasswordElement.attr('class'));
                            passwordIsValid = /invalid/.test(passwordElement.attr('class')) === false;

                            // if(confirmPasswordIsDirty && passwordIsValid){
                            if(passwordIsValid){
                                passwordMatch =  $('[name=password]').val() === $element.val();                        
                                
                                ngModelController.$setValidity('validationconfirmpassword', passwordMatch); 
                                   confirmPasswordElement
                                    .siblings('.CustomValidationError.validationConfirmPassword:first')
                                        .toggle(! passwordMatch);    
                            }                        
                        });
                        return;
                    }

                    if (formatterArgs.customValidationAttribute === 'validationFieldRequired') {
                        $element.parents('form').find('label[for='+$element.attr('id')+']').addClass('requiredFieldLabel');
                    }

                    runCustomValidations = function (errorMessageElement) {
                        var isValid, value, customValidationBroadcastArg, currentlyDisplayingAnErrorMessage, 
                            currentErrorMessage, currentErrorMessageIsStale,
                            currentErrorMessageValidator, currentErrorMessagePriorityIndex, 
                            currentErrorMessageIsOfALowerPriority, fieldNameSelector;

                        fieldNameSelector = '[data-custom-field-name="'+ $element.attr('name') +'"]';

                        currentErrorMessage = isCurrentlyDisplayingAnErrorMessageInATemplate($element) ?
                            currentlyDisplayedTemplate.children('.CustomValidationError[style="display: inline;"]'+fieldNameSelector+', '+
                                '.CustomValidationError[style="display: block;"]'+fieldNameSelector)
                            : $element.siblings('.CustomValidationError[style="display: inline;"]'+fieldNameSelector+', '+
                                '.CustomValidationError[style="display: block;"]'+fieldNameSelector);

                        currentlyDisplayingAnErrorMessage = currentErrorMessage.length > 0;

                        value = $element.val().trimRight();

                        isValid = formatterArgs.validator(errorMessageElement, value, validationAttributeValue, $element, model, ngModelController, $scope);

                        ngModelController.$setValidity(formatterArgs.customValidationAttribute.toLowerCase(), isValid);

                        customValidationBroadcastArg = {
                            isValid: isValid,
                            validation: formatterArgs.customValidationAttribute,
                            model: model,
                            controller: ngModelController,
                            element: $element
                        };
                        

                        if(! currentlyDisplayingAnErrorMessage) {
                            $element.siblings('.CustomValidationError.'+ formatterArgs.customValidationAttribute + '.' + propertyName + 'property:first')
                                .toggle(!isValid);
                        } else if(! isCurrentlyDisplayingAnErrorMessageInATemplate($element)){ 
                            currentErrorMessageValidator = getValidatorByAttribute(currentErrorMessage.attr('data-custom-validation-attribute'));
                            currentErrorMessageIsStale = currentErrorMessageValidator(errorMessageElement.clone(), value, $attrs[currentErrorMessage.attr('data-custom-validation-attribute')], $element, model, ngModelController, $scope);
                            
                            currentErrorMessagePriorityIndex = parseInt(currentErrorMessage.attr('data-custom-validation-priorityIndex'), 10);
                            currentErrorMessageIsOfALowerPriority = currentErrorMessagePriorityIndex >= getValidationPriorityIndex(formatterArgs.customValidationAttribute);
                            
                            if (currentErrorMessageIsStale || (!currentErrorMessageIsStale && currentErrorMessageIsOfALowerPriority && !isValid)) {
                                currentErrorMessage.hide();
                                $element.siblings('.CustomValidationError.'+ formatterArgs.customValidationAttribute + '.' + propertyName + 'property:first')
                                    .toggle(!isValid);                        
                            }                      
                        }

                        if(isCurrentlyDisplayingAnErrorMessageInATemplate($element)) {
                            currentErrorMessageValidator = getValidatorByAttribute(currentErrorMessage.attr('data-custom-validation-attribute'));
                            currentErrorMessageIsStale = currentErrorMessageValidator(
                                errorMessageElement,
                                value, 
                                getValidationAttributeValue($attrs[currentErrorMessage.attr('data-custom-validation-attribute')]), 
                                $element, model, ngModelController
                            );
                            
                            currentErrorMessagePriorityIndex = parseInt(currentErrorMessage.attr('data-custom-validation-priorityIndex'), 10);
                            currentErrorMessageIsOfALowerPriority = currentErrorMessagePriorityIndex >= getValidationPriorityIndex(formatterArgs.customValidationAttribute);
                            
                            if (currentErrorMessageIsStale || (!currentErrorMessageIsStale && currentErrorMessageIsOfALowerPriority && !isValid 
                                && currentlyDisplayedTemplate.children().attr('class').indexOf(formatterArgs.customValidationAttribute) === -1)) {
                                currentErrorMessage.hide();
                                $element.siblings('.CustomValidationError.'+ formatterArgs.customValidationAttribute + '.' + propertyName + 'property:first')
                                    .toggle(!isValid);                              
                                $scope.$broadcast('errorMessageToggled');
                            }                      
                        }

                        $scope.$broadcast('customValidationComplete', customValidationBroadcastArg);
                        return value;
                    };

                    ngModelController.$parsers.push(function() {
                        return runCustomValidations(errorMessageElement);
                    });

                    $scope.$on('runCustomValidations', function () {
                        runCustomValidations(errorMessageElement);
                    });
                }    

            });
        };    
    };
    
    customValidationsModule = angular.module('directives.customvalidation.customValidations', [
        'directives.invalidinputformatter.invalidInputFormatter',
        'services.templateRetriever'
    ])

    .factory('customValidationUtil', function (templateRetriever, $q, $timeout, $log) {
        return {
            createValidationLink: function (customValidation) {
                customValidations.push(customValidation);
                return createValidationFormatterLink(customValidation, templateRetriever, $q, $timeout, $log)
            }
        }
    })

    .directive('input', function (customValidationUtil) {
        return {
            require: '?ngModel',
            restrict: 'E',            
            link: customValidationUtil.createValidationLink(dynamicallyDefinedValidation)
        };
    });


    //shared config functions
    return {
        getValidationAttributeValue: getValidationAttributeValue
    };

})();