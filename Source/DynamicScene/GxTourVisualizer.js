/*global define*/
define([
        '../Core/Cartesian3',
	'../Core/Math',
        '../Core/Matrix3',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/destroyObject',
        '../Core/Quaternion',
        '../Scene/CameraController',
        '../Scene/Polygon',
        '../Scene/Material',
        './MaterialProperty'
       ], function(
         Cartesian3,
         CesiumMath,
         Matrix3,
         defined,
         DeveloperError,
         Ellipsoid,
         destroyObject,
         Quaternion,
         CameraController,
         Polygon,
         Material,
         MaterialProperty) {
    "use strict";

    /**
     * A gx:Tour visualizer, which updates the camera view according to the gx:Tour description from
     * a KML file
     *
     * @alias GxTourVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the camera is updated for.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     */
    var GxTourVisualizer = function(scene, dynamicObjectCollection) {
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        this._scene = scene;
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    GxTourVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    GxTourVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    GxTourVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            this._dynamicObjectCollection = dynamicObjectCollection;
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     *
     * @exception {DeveloperError} time is required.
     */
    GxTourVisualizer.prototype.update = function(time) {
        if (!defined(time)) {
            throw new DeveloperError('time is requied.');
        }

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (var i = 0, len = dynamicObjects.length; i < len; i++) {
                updateObject(this, time, dynamicObjects[i]);
            }
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    GxTourVisualizer.prototype.removeAllPrimitives = function() {
        // Empty method
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof GxTourVisualizer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see GxTourVisualizer#destroy
     */
    GxTourVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof GxTourVisualizer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see GxTourVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    GxTourVisualizer.prototype.destroy = function() {
        return destroyObject(this);
    };




    var lookScratchQuaternion = new Quaternion();
    var lookScratchMatrix = new Matrix3();
    var applyFreeLook = function(freeLook, camera) {
        var ctx = {
            _camera: camera,
            defaultLookAmount: Math.PI / 60.0,

            lookUp: CameraController.prototype.lookUp,
            lookRight: CameraController.prototype.lookRight,
            look: CameraController.prototype.look
        };

        ctx.lookUp(CesiumMath.toRadians(freeLook.vangle));
        ctx.lookRight(CesiumMath.toRadians(freeLook.hangle));
    };


    function updateObject(visualizer, time, dynamicObject) {
        if (typeof dynamicObject.gxTour === 'undefined') {
            return;
        }

        var showProperty = dynamicObject.gxTour._show;
        var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));
        if (!show ) {
            return;
        }

        var millisecs = dynamicObject.availability.start.getSecondsDifference(time) * 1000;
        if (dynamicObject.durationms < millisecs) {
            return;
        }

        var scene = visualizer.getScene();
        var camera = scene.getCamera();

        /* Apply basic mods to camera */
        var orientation = dynamicObject.orientations.evaluate(millisecs);
        var rotMatrix = new Matrix3();
        var path = dynamicObject.camerapath;
        Matrix3.fromQuaternion(orientation, rotMatrix);

        camera.position = path.evaluate(millisecs);

        camera.right = Matrix3.getRow(rotMatrix, 0);
        camera.up = Matrix3.getRow(rotMatrix, 1);
        camera.direction = Cartesian3.negate(Matrix3.getRow(rotMatrix, 2, camera.direction), camera.direction);


        if (scene.freeLook) {
            applyFreeLook(scene.freeLook, camera);
        }
    }

    return GxTourVisualizer;
});

