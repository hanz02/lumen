package com.plantarapp

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.graphics.PorterDuff
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.ar.core.Anchor
import com.google.ar.core.Config
import com.google.ar.core.DepthPoint
import com.google.ar.core.Frame
import com.google.ar.core.HitResult
import com.google.ar.core.Plane
import com.google.ar.core.Point
import com.google.ar.core.Pose
import com.google.ar.core.Session
import com.google.ar.core.TrackingState
import com.google.ar.sceneform.AnchorNode
import com.google.ar.sceneform.ArSceneView
import com.google.ar.sceneform.Node
import com.google.ar.sceneform.math.Quaternion
import com.google.ar.sceneform.math.Vector3
import com.google.ar.sceneform.rendering.Material
import com.google.ar.sceneform.rendering.MaterialFactory
import com.google.ar.sceneform.rendering.ShapeFactory
import com.google.ar.sceneform.ux.ArFragment
import kotlin.math.sqrt

class ARMeasurementActivity : AppCompatActivity() {

    private lateinit var arFragment: ArFragment

    private lateinit var plantDistanceModeButton: TextView
    private lateinit var windowMeasureModeButton: TextView
    private lateinit var snapPointButton: TextView
    private lateinit var resetButton: TextView

    private lateinit var statusText: TextView
    private lateinit var centerReticle: ImageView
    private lateinit var reticleLoading: ProgressBar
    private lateinit var liveMeasurementBadge: TextView
    private lateinit var confidenceDot: View

    private var firstAnchor: Anchor? = null
    private var secondAnchor: Anchor? = null

    private var firstHitQuality: HitQuality? = null
    private var secondHitQuality: HitQuality? = null

    private val placedMarkerNodes = mutableListOf<AnchorNode>()

    private var previewLineNode: Node? = null
    private var finalLineNode: Node? = null

    private var plantPreviewNode: Node? = null
    private var placedPlantAnchorNode: AnchorNode? = null
    private var secondPointPreviewNode: Node? = null
    private var windowPreviewNode: Node? = null

    private var firstMarkerMaterial: Material? = null
    private var secondMarkerMaterial: Material? = null
    private var previewLineMaterial: Material? = null
    private var finalLineMaterial: Material? = null

    private var plantLeafMaterial: Material? = null
    private var plantStemMaterial: Material? = null
    private var plantPlacementRingMaterial: Material? = null

    private var windowDiscFillMaterial: Material? = null
    private var windowDiscDotMaterial: Material? = null

    private val reticleHandler = Handler(Looper.getMainLooper())
    private var reticleRunnable: Runnable? = null

    private enum class MeasurementTool {
        PLANT_DISTANCE,
        WINDOW_MEASURE
    }

    private enum class HitQuality {
        PLANE,
        DEPTH,
        FEATURE_POINT,
        INSTANT_PLACEMENT
    }

    private data class HitCandidate(
        val hitResult: HitResult,
        val quality: HitQuality
    )

    private var currentTool = MeasurementTool.PLANT_DISTANCE
    private var isReticleReady = false
    private var currentReticleQuality: HitQuality? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_ar)

        plantDistanceModeButton = findViewById(R.id.plantDistanceModeButton)
        windowMeasureModeButton = findViewById(R.id.windowMeasureModeButton)
        snapPointButton = findViewById(R.id.snapPointButton)
        resetButton = findViewById(R.id.resetButton)

        statusText = findViewById(R.id.statusText)
        centerReticle = findViewById(R.id.centerReticle)
        reticleLoading = findViewById(R.id.reticleLoading)
        liveMeasurementBadge = findViewById(R.id.liveMeasurementBadge)
        confidenceDot = findViewById(R.id.confidenceDot)

        arFragment = supportFragmentManager
            .findFragmentById(R.id.arFragment) as ArFragment

        hidePlaneVisuals()
        createMaterials()
        configureARSession()
        setupButtons()
        updateModeButtonUi()
        setStatusForCurrentToolStart()
        setReticleReady(false, null)
        startReticleMonitor()
    }

    private fun hidePlaneVisuals() {
        try {
            arFragment.arSceneView.planeRenderer.isEnabled = false
        } catch (_: Exception) {
            // Keep AR running even if this Sceneform version handles plane rendering differently.
        }
    }

    private fun createMaterials() {
        MaterialFactory.makeOpaqueWithColor(
            this,
            com.google.ar.sceneform.rendering.Color(
                android.graphics.Color.rgb(111, 143, 78)
            )
        ).thenAccept { material ->
            firstMarkerMaterial = material
            plantLeafMaterial = material
        }

        MaterialFactory.makeOpaqueWithColor(
            this,
            com.google.ar.sceneform.rendering.Color(
                android.graphics.Color.rgb(47, 79, 53)
            )
        ).thenAccept { material ->
            plantStemMaterial = material
        }

        MaterialFactory.makeOpaqueWithColor(
            this,
            com.google.ar.sceneform.rendering.Color(
                android.graphics.Color.rgb(246, 201, 69)
            )
        ).thenAccept { material ->
            secondMarkerMaterial = material
            finalLineMaterial = material
        }

        MaterialFactory.makeOpaqueWithColor(
            this,
            com.google.ar.sceneform.rendering.Color(
                android.graphics.Color.argb(120, 255, 255, 255)
            )
        ).thenAccept { material ->
            previewLineMaterial = material
        }

        MaterialFactory.makeTransparentWithColor(
            this,
            com.google.ar.sceneform.rendering.Color(
                android.graphics.Color.argb(85, 246, 201, 69)
            )
        ).thenAccept { material ->
            plantPlacementRingMaterial = material
        }

        MaterialFactory.makeTransparentWithColor(
            this,
            com.google.ar.sceneform.rendering.Color(
                android.graphics.Color.argb(95, 90, 255, 240)
            )
        ).thenAccept { material ->
            windowDiscFillMaterial = material
        }

        MaterialFactory.makeOpaqueWithColor(
            this,
            com.google.ar.sceneform.rendering.Color(
                android.graphics.Color.rgb(90, 255, 240)
            )
        ).thenAccept { material ->
            windowDiscDotMaterial = material
        }
    }

    private fun configureARSession() {
        arFragment.setOnSessionConfigurationListener { session: Session, config: Config ->
            config.lightEstimationMode = Config.LightEstimationMode.DISABLED
            config.planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
            config.updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE

            if (session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) {
                config.depthMode = Config.DepthMode.AUTOMATIC
            } else {
                config.depthMode = Config.DepthMode.DISABLED
            }

            config.instantPlacementMode = Config.InstantPlacementMode.LOCAL_Y_UP
        }
    }

    private fun setupButtons() {
        plantDistanceModeButton.setOnClickListener {
            currentTool = MeasurementTool.PLANT_DISTANCE
            resetMeasurement()
            updateModeButtonUi()
            setStatusForCurrentToolStart()
        }

        windowMeasureModeButton.setOnClickListener {
            currentTool = MeasurementTool.WINDOW_MEASURE
            resetMeasurement()
            updateModeButtonUi()
            setStatusForCurrentToolStart()
        }

        snapPointButton.setOnClickListener {
            snapPointAtScreenCenter()
        }

        resetButton.setOnClickListener {
            resetMeasurement()
            setStatusForCurrentToolStart()
        }
    }

    private fun updateModeButtonUi() {
        when (currentTool) {
            MeasurementTool.PLANT_DISTANCE -> {
                plantDistanceModeButton.setBackgroundResource(R.drawable.ar_pill_active)
                windowMeasureModeButton.setBackgroundResource(R.drawable.ar_pill_inactive)
            }

            MeasurementTool.WINDOW_MEASURE -> {
                plantDistanceModeButton.setBackgroundResource(R.drawable.ar_pill_inactive)
                windowMeasureModeButton.setBackgroundResource(R.drawable.ar_pill_active)
            }
        }
    }

    private fun startReticleMonitor() {
        reticleRunnable = object : Runnable {
            override fun run() {
                updateReticleState()
                reticleHandler.postDelayed(this, 200)
            }
        }

        reticleHandler.post(reticleRunnable!!)
    }

    private fun updateReticleState() {
        val sceneView = getSceneViewOrNull()

        if (sceneView == null || sceneView.width == 0 || sceneView.height == 0) {
            setReticleReady(false, null)
            clearMovingPreviews()
            return
        }

        val frame = sceneView.arFrame

        if (frame == null) {
            setReticleReady(false, null)
            clearMovingPreviews()
            return
        }

        val centerX = sceneView.width / 2f
        val centerY = sceneView.height / 2f

        val hitCandidate = findValidHit(frame.hitTest(centerX, centerY))

        if (hitCandidate != null) {
            setReticleReady(true, hitCandidate.quality)
            updateWorldPreviewForCurrentTool(hitCandidate.hitResult.hitPose)
            updateLiveMeasurement(hitCandidate.hitResult.hitPose)
            return
        }

        if (currentTool == MeasurementTool.PLANT_DISTANCE) {
            val instantHits = frame.hitTestInstantPlacement(centerX, centerY, 1.5f)

            if (instantHits.isNotEmpty()) {
                setReticleReady(true, HitQuality.INSTANT_PLACEMENT)
                updateWorldPreviewForCurrentTool(instantHits.first().hitPose)
                updateLiveMeasurement(instantHits.first().hitPose)
                return
            }
        }

        setReticleReady(false, null)
        clearMovingPreviews()
    }

    private fun updateWorldPreviewForCurrentTool(currentHitPose: Pose) {
        when (currentTool) {
            MeasurementTool.PLANT_DISTANCE -> {
                removeWindowPreview()

                if (firstAnchor == null) {
                    updatePlantPreview(currentHitPose)
                    removePreviewLine()
                    removeSecondPointPreview()
                    return
                }

                removePlantPreview()

                if (firstAnchor != null && secondAnchor == null) {
                    updatePreviewLineIfNeeded(currentHitPose)
                    updateSecondPointPreview(currentHitPose)
                    return
                }

                removePreviewLine()
                removeSecondPointPreview()
            }

            MeasurementTool.WINDOW_MEASURE -> {
                removePlantPreview()
                removeSecondPointPreview()

                if (secondAnchor != null) {
                    removeWindowPreview()
                    removePreviewLine()
                    return
                }

                updateWindowPreview(currentHitPose)

                if (firstAnchor != null && secondAnchor == null) {
                    updatePreviewLineIfNeeded(currentHitPose)
                } else {
                    removePreviewLine()
                }
            }
        }
    }

    private fun clearMovingPreviews() {
        removePreviewLine()
        removePlantPreview()
        removeSecondPointPreview()
        removeWindowPreview()
    }

    private fun updatePlantPreview(hitPose: Pose) {
        val scene = arFragment.arSceneView.scene

        if (plantPreviewNode == null) {
            plantPreviewNode = createPlantNode()
            plantPreviewNode?.setParent(scene)
        }

        plantPreviewNode?.worldPosition = poseToVector3(hitPose)

        /*
         * Keep preview plant upright.
         * It rotates only around the vertical Y-axis for a 3D placement feeling.
         */
        val time = System.currentTimeMillis() % 6000L
        val angle = (time / 6000f) * 360f
        plantPreviewNode?.worldRotation = Quaternion.axisAngle(Vector3.up(), angle)
    }

    private fun placeAnchoredPlant(anchor: Anchor): Boolean {
        val plantNode = createPlantNode()

        if (plantNode == null) {
            setStatus("Plant model is loading. Try again.")
            return false
        }

        val anchorNode = AnchorNode(anchor)
        anchorNode.setParent(arFragment.arSceneView.scene)

        plantNode.setParent(anchorNode)
        plantNode.localPosition = Vector3.zero()

        /*
         * Important:
         * The AR anchor may contain a tilted pose, especially from DepthPoint,
         * FeaturePoint, Instant Placement, or slightly uneven detected surfaces.
         * Force the plant to stay upright instead of inheriting the anchor tilt.
         */
        plantNode.worldRotation = Quaternion.axisAngle(Vector3.up(), 0f)

        placedPlantAnchorNode = anchorNode
        return true
    }

    private fun removePlantPreview() {
        plantPreviewNode?.setParent(null)
        plantPreviewNode = null
    }

    private fun removePlacedPlant() {
        placedPlantAnchorNode?.setParent(null)
        placedPlantAnchorNode = null
    }

    private fun createPlantNode(): Node? {
        val leafMaterial = plantLeafMaterial ?: return null
        val stemMaterial = plantStemMaterial ?: return null
        val ringMaterial = plantPlacementRingMaterial ?: return null

        val plantRoot = Node()

        // Placement ring
        val ringNode = Node()
        ringNode.renderable = ShapeFactory.makeCylinder(0.10f, 0.003f, Vector3.zero(), ringMaterial)
        ringNode.localPosition = Vector3(0f, 0.002f, 0f)
        ringNode.setParent(plantRoot)

        // Short stem
        val stemNode = Node()
        stemNode.renderable = ShapeFactory.makeCylinder(0.006f, 0.08f, Vector3.zero(), stemMaterial)
        stemNode.localPosition = Vector3(0f, 0.05f, 0f)
        stemNode.setParent(plantRoot)

        // 3 compact leaves
        addLeafNode(
            parent = plantRoot,
            material = leafMaterial,
            position = Vector3(-0.024f, 0.105f, 0f),
            scale = Vector3(1.4f, 0.7f, 1.0f),
            rotationDegrees = 18f
        )

        addLeafNode(
            parent = plantRoot,
            material = leafMaterial,
            position = Vector3(0.024f, 0.105f, 0f),
            scale = Vector3(1.4f, 0.7f, 1.0f),
            rotationDegrees = -18f
        )

        addLeafNode(
            parent = plantRoot,
            material = leafMaterial,
            position = Vector3(0f, 0.120f, 0f),
            scale = Vector3(1.0f, 0.7f, 1.0f),
            rotationDegrees = 0f
        )

        return plantRoot
    }

    private fun addLeafNode(
        parent: Node,
        material: Material,
        position: Vector3,
        scale: Vector3,
        rotationDegrees: Float
    ) {
        val leafRenderable = ShapeFactory.makeSphere(
            0.028f,
            Vector3.zero(),
            material
        )

        val leafNode = Node()
        leafNode.renderable = leafRenderable
        leafNode.localPosition = position
        leafNode.localScale = scale
        leafNode.localRotation = Quaternion.axisAngle(Vector3.up(), rotationDegrees)
        leafNode.setParent(parent)
    }

    private fun updateSecondPointPreview(hitPose: Pose) {
        val outerMat = windowDiscDotMaterial ?: return
        val accentMat = secondMarkerMaterial ?: return
        val scene = arFragment.arSceneView.scene

        if (secondPointPreviewNode == null) {
            val root = Node()
            buildTargetMarker(root, outerMat, accentMat)
            secondPointPreviewNode = root
            secondPointPreviewNode?.setParent(scene)
        }

        secondPointPreviewNode?.worldPosition = poseToVector3(hitPose)
        secondPointPreviewNode?.worldRotation = poseToQuaternion(hitPose)
    }

    private fun removeSecondPointPreview() {
        secondPointPreviewNode?.setParent(null)
        secondPointPreviewNode = null
    }

    private fun updateWindowPreview(hitPose: Pose) {
        val scene = arFragment.arSceneView.scene

        if (windowPreviewNode == null) {
            windowPreviewNode = createWindowPreviewNode()
            windowPreviewNode?.setParent(scene)
        }

        windowPreviewNode?.worldPosition = poseToVector3(hitPose)
        windowPreviewNode?.worldRotation = poseToQuaternion(hitPose)
    }

    private fun createWindowPreviewNode(): Node? {
        val outerMat = windowDiscDotMaterial ?: return null
        val accentMat = windowDiscFillMaterial ?: return null

        val root = Node()
        buildTargetMarker(root, outerMat, accentMat)
        return root
    }

    /**
     * Flat 2-ring + centre-dot target marker (like a rifle reticle).
     * Uses thin cylinders (height 1 mm) so the marker is essentially 2D.
     * outerMat = outer ring colour, accentMat = inner ring + dot colour.
     */
    private fun buildTargetMarker(root: Node, outerMat: Material, accentMat: Material) {
        buildFlatRing(root, 48, 0.030f, 0.0042f, outerMat)
        buildFlatRing(root, 36, 0.018f, 0.0032f, accentMat)
        val dot = Node()
        dot.renderable = ShapeFactory.makeCylinder(0.006f, 0.001f, Vector3.zero(), accentMat)
        dot.localPosition = Vector3.zero()
        dot.setParent(root)
    }

    private fun buildFlatRing(parent: Node, beads: Int, ringRadius: Float, beadRadius: Float, mat: Material) {
        val renderable = ShapeFactory.makeCylinder(beadRadius, 0.001f, Vector3.zero(), mat)
        for (i in 0 until beads) {
            val angle = (i.toFloat() / beads) * 2f * Math.PI.toFloat()
            val bead = Node()
            bead.renderable = renderable
            bead.localPosition = Vector3(
                kotlin.math.cos(angle) * ringRadius,
                0f,
                kotlin.math.sin(angle) * ringRadius
            )
            bead.setParent(parent)
        }
    }

    private fun removeWindowPreview() {
        windowPreviewNode?.setParent(null)
        windowPreviewNode = null
    }

    private fun snapPointAtScreenCenter() {
        val sceneView = getSceneViewOrNull()

        if (sceneView == null || sceneView.width == 0 || sceneView.height == 0) {
            setStatus("AR view is not ready. Move your phone slowly.")
            return
        }

        val frame: Frame? = sceneView.arFrame

        if (frame == null) {
            setStatus("AR frame is not ready. Move your phone slowly.")
            return
        }

        val centerX = sceneView.width / 2f
        val centerY = sceneView.height / 2f

        val hitCandidate = findValidHit(frame.hitTest(centerX, centerY))

        if (hitCandidate != null) {
            val anchor = hitCandidate.hitResult.createAnchor()
            handlePointCaptured(anchor, hitCandidate.quality)
            return
        }

        if (currentTool == MeasurementTool.PLANT_DISTANCE) {
            val instantHits = frame.hitTestInstantPlacement(centerX, centerY, 1.5f)

            if (instantHits.isNotEmpty()) {
                val anchor = instantHits.first().createAnchor()
                handlePointCaptured(anchor, HitQuality.INSTANT_PLACEMENT)
                return
            }
        }

        when (currentTool) {
            MeasurementTool.PLANT_DISTANCE ->
                setStatus("No floor point found. Aim at a textured floor or plant spot.")

            MeasurementTool.WINDOW_MEASURE ->
                setStatus("No window point found. Try a frame edge or tape marker.")
        }
    }

    private fun findValidHit(hitResults: List<HitResult>): HitCandidate? {
        var planeHit: HitResult? = null
        var depthHit: HitResult? = null
        var pointHit: HitResult? = null

        for (hit in hitResults) {
            val trackable = hit.trackable

            when (trackable) {
                is Plane -> {
                    if (
                        trackable.trackingState == TrackingState.TRACKING &&
                        trackable.isPoseInPolygon(hit.hitPose) &&
                        isPlaneValidForCurrentTool(trackable)
                    ) {
                        planeHit = hit
                        break
                    }
                }

                is DepthPoint -> {
                    if (trackable.trackingState == TrackingState.TRACKING) {
                        depthHit = hit
                    }
                }

                is Point -> {
                    if (trackable.trackingState == TrackingState.TRACKING) {
                        pointHit = hit
                    }
                }
            }
        }

        return when {
            planeHit != null -> HitCandidate(planeHit, HitQuality.PLANE)
            depthHit != null -> HitCandidate(depthHit, HitQuality.DEPTH)
            pointHit != null -> HitCandidate(pointHit, HitQuality.FEATURE_POINT)
            else -> null
        }
    }

    private fun isPlaneValidForCurrentTool(plane: Plane): Boolean {
        return when (currentTool) {
            MeasurementTool.PLANT_DISTANCE ->
                plane.type == Plane.Type.HORIZONTAL_UPWARD_FACING

            MeasurementTool.WINDOW_MEASURE ->
                plane.type == Plane.Type.VERTICAL
        }
    }

    private fun handlePointCaptured(anchor: Anchor, quality: HitQuality) {
        vibrateSuccess()

        if (firstAnchor == null) {
            when (currentTool) {
                MeasurementTool.PLANT_DISTANCE -> {
                    removePlantPreview()
                    removeWindowPreview()

                    val plantPlaced = placeAnchoredPlant(anchor)

                    if (!plantPlaced) {
                        anchor.detach()
                        return
                    }

                    firstAnchor = anchor
                    firstHitQuality = quality

                    setStatus("Plant placed. Aim at the window or floor reference point and press +.")
                }

                MeasurementTool.WINDOW_MEASURE -> {
                    removePlantPreview()
                    removeWindowPreview()

                    firstAnchor = anchor
                    firstHitQuality = quality

                    placeMarker(anchor, isFirstPoint = true)

                    setStatus("First window point saved. Aim at the second window point and press +.")
                }
            }

            return
        }

        if (secondAnchor == null) {
            secondAnchor = anchor
            secondHitQuality = quality

            removeSecondPointPreview()
            removeWindowPreview()

            placeMarker(anchor, isFirstPoint = false)

            removePreviewLine()
            drawFinalLine(firstAnchor!!, secondAnchor!!)

            val distanceMeters = calculateDistance(firstAnchor!!, secondAnchor!!)
            val distanceCm = distanceMeters * 100f
            val overallQuality = getOverallQuality(firstHitQuality, secondHitQuality)

            liveMeasurementBadge.text = if (distanceMeters >= 1f) "%.2f m".format(distanceMeters)
                                        else "%.0f cm".format(distanceCm)
            liveMeasurementBadge.visibility = View.VISIBLE

            when (currentTool) {
                MeasurementTool.PLANT_DISTANCE ->
                    setStatus("Plant-to-reference distance: %.1f cm".format(distanceCm))

                MeasurementTool.WINDOW_MEASURE ->
                    setStatus("Window measurement: %.1f cm".format(distanceCm))
            }

            showDistanceDialog(distanceMeters, overallQuality)
        }
    }

    private fun placeMarker(anchor: Anchor, isFirstPoint: Boolean) {
        if (currentTool == MeasurementTool.WINDOW_MEASURE) {
            placeWindowDiscMarker(anchor, isFirstPoint)
            return
        }

        val outerMat = windowDiscDotMaterial
        val accentMat = if (isFirstPoint) firstMarkerMaterial else secondMarkerMaterial

        if (outerMat == null || accentMat == null) {
            setStatus("Marker is loading. Try again.")
            return
        }

        val anchorNode = AnchorNode(anchor)
        anchorNode.setParent(arFragment.arSceneView.scene)

        val root = Node()
        root.setParent(anchorNode)
        buildTargetMarker(root, outerMat, accentMat)

        placedMarkerNodes.add(anchorNode)
    }

    private fun placeWindowDiscMarker(anchor: Anchor, isFirstPoint: Boolean) {
        val outerMat = windowDiscDotMaterial
        val accentMat = if (isFirstPoint) firstMarkerMaterial else secondMarkerMaterial

        if (outerMat == null || accentMat == null) {
            setStatus("Window marker is loading. Try again.")
            return
        }

        val anchorNode = AnchorNode(anchor)
        anchorNode.setParent(arFragment.arSceneView.scene)

        val root = Node()
        root.setParent(anchorNode)
        buildTargetMarker(root, outerMat, accentMat)

        placedMarkerNodes.add(anchorNode)
    }

    private fun updateLiveMeasurement(currentPose: Pose) {
        if (firstAnchor == null) {
            liveMeasurementBadge.visibility = View.GONE
            return
        }
        if (secondAnchor != null) return

        val dist = calculateDistanceFromPoses(firstAnchor!!.pose, currentPose)
        liveMeasurementBadge.text = if (dist >= 1f) "%.2f m".format(dist)
                                    else "%.0f cm".format(dist * 100f)
        liveMeasurementBadge.visibility = View.VISIBLE
    }

    private fun calculateDistanceFromPoses(pose1: Pose, pose2: Pose): Float {
        val dx = pose1.tx() - pose2.tx()
        val dy = pose1.ty() - pose2.ty()
        val dz = pose1.tz() - pose2.tz()
        return sqrt(dx * dx + dy * dy + dz * dz)
    }

    private fun updatePreviewLineIfNeeded(currentHitPose: Pose) {
        val first = firstAnchor ?: return
        if (secondAnchor != null) return

        val start = poseToVector3(first.pose)
        val end = poseToVector3(currentHitPose)

        removePreviewLine()
        previewLineNode = createLineNode(start, end, isPreview = true)
    }

    private fun drawFinalLine(anchor1: Anchor, anchor2: Anchor) {
        val start = poseToVector3(anchor1.pose)
        val end = poseToVector3(anchor2.pose)

        removeFinalLine()
        finalLineNode = createLineNode(start, end, isPreview = false)
    }

    private fun createLineNode(start: Vector3, end: Vector3, isPreview: Boolean): Node? {
        val material = if (isPreview) previewLineMaterial else finalLineMaterial

        if (material == null) return null

        val difference = Vector3.subtract(end, start)
        val length = difference.length()

        if (length < 0.01f) return null

        val direction = difference.normalized()

        val midpoint = Vector3(
            (start.x + end.x) / 2f,
            (start.y + end.y) / 2f,
            (start.z + end.z) / 2f
        )

        val lineRadius = if (isPreview) 0.0018f else 0.0028f

        val lineRenderable = ShapeFactory.makeCylinder(
            lineRadius,
            length,
            Vector3.zero(),
            material
        )

        val lineNode = Node()
        lineNode.renderable = lineRenderable
        lineNode.setParent(arFragment.arSceneView.scene)
        lineNode.worldPosition = midpoint
        lineNode.worldRotation = Quaternion.rotationBetweenVectors(Vector3.up(), direction)

        return lineNode
    }

    private fun removePreviewLine() {
        previewLineNode?.setParent(null)
        previewLineNode = null
    }

    private fun removeFinalLine() {
        finalLineNode?.setParent(null)
        finalLineNode = null
    }

    private fun poseToVector3(pose: Pose): Vector3 {
        return Vector3(pose.tx(), pose.ty(), pose.tz())
    }

    private fun poseToQuaternion(pose: Pose): Quaternion {
        return Quaternion(pose.qx(), pose.qy(), pose.qz(), pose.qw())
    }

    private fun calculateDistance(anchor1: Anchor, anchor2: Anchor): Float {
        val pose1 = anchor1.pose
        val pose2 = anchor2.pose

        val dx = pose1.tx() - pose2.tx()
        val dy = pose1.ty() - pose2.ty()
        val dz = pose1.tz() - pose2.tz()

        return sqrt(dx * dx + dy * dy + dz * dz)
    }

    private fun showDistanceDialog(distanceMeters: Float, overallQuality: HitQuality) {
        val distanceCm = distanceMeters * 100f

        val title = when (currentTool) {
            MeasurementTool.PLANT_DISTANCE -> "Plant Placement Distance"
            MeasurementTool.WINDOW_MEASURE -> "Window Measurement"
        }

        val message = when (currentTool) {
            MeasurementTool.PLANT_DISTANCE ->
                "Distance: %.1f cm\nConfidence: %s".format(
                    distanceCm,
                    confidenceLabel(overallQuality)
                )

            MeasurementTool.WINDOW_MEASURE ->
                "Measurement: %.1f cm\nConfidence: %s".format(
                    distanceCm,
                    confidenceLabel(overallQuality)
                )
        }

        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("Use Measurement") { _, _ ->
                returnDistanceToReactNative(distanceMeters, overallQuality)
            }
            .setNegativeButton("Measure Again") { _, _ ->
                resetMeasurement()
                setStatusForCurrentToolStart()
            }
            .setCancelable(false)
            .show()
    }

    private fun resetMeasurement() {
        firstAnchor?.detach()
        secondAnchor?.detach()

        firstAnchor = null
        secondAnchor = null
        firstHitQuality = null
        secondHitQuality = null

        placedMarkerNodes.forEach { node ->
            node.setParent(null)
            node.anchor?.detach()
        }

        placedMarkerNodes.clear()

        removePlantPreview()
        removePlacedPlant()
        removeSecondPointPreview()
        removeWindowPreview()
        removePreviewLine()
        removeFinalLine()

        liveMeasurementBadge.visibility = View.GONE
    }

    private fun returnDistanceToReactNative(distanceMeters: Float, overallQuality: HitQuality) {
        val resultIntent = Intent().apply {
            putExtra("distance_meters", distanceMeters)
            putExtra("distance_cm", distanceMeters * 100f)
            putExtra("measurement_tool", currentTool.name)
            putExtra("overall_quality", overallQuality.name)
            putExtra("first_point_quality", firstHitQuality?.name ?: "UNKNOWN")
            putExtra("second_point_quality", secondHitQuality?.name ?: "UNKNOWN")
        }

        setResult(Activity.RESULT_OK, resultIntent)
        finish()
    }

    private fun getOverallQuality(first: HitQuality?, second: HitQuality?): HitQuality {
        val qualities = listOfNotNull(first, second)

        if (qualities.isEmpty()) return HitQuality.FEATURE_POINT

        return when {
            qualities.contains(HitQuality.INSTANT_PLACEMENT) -> HitQuality.INSTANT_PLACEMENT
            qualities.contains(HitQuality.FEATURE_POINT) -> HitQuality.FEATURE_POINT
            qualities.contains(HitQuality.DEPTH) -> HitQuality.DEPTH
            else -> HitQuality.PLANE
        }
    }

    private fun confidenceLabel(quality: HitQuality): String {
        return when (quality) {
            HitQuality.PLANE -> "High"
            HitQuality.DEPTH -> "Medium"
            HitQuality.FEATURE_POINT -> "Low"
            HitQuality.INSTANT_PLACEMENT -> "Estimated"
        }
    }

    private fun setStatusForCurrentToolStart() {
        when (currentTool) {
            MeasurementTool.PLANT_DISTANCE ->
                setStatus("Move the plant onto the floor placement spot, then press +.")

            MeasurementTool.WINDOW_MEASURE ->
                setStatus("Aim the disc at a window-frame or wall marker, then press +.")
        }
    }

    private fun setStatus(message: String) {
        statusText.text = message
    }

    private fun setReticleReady(isReady: Boolean, quality: HitQuality?) {
        if (isReticleReady == isReady && currentReticleQuality == quality) return

        isReticleReady = isReady
        currentReticleQuality = quality

        if (isReady) {
            centerReticle.visibility =
                if (
                    (currentTool == MeasurementTool.PLANT_DISTANCE && firstAnchor == null) ||
                    currentTool == MeasurementTool.WINDOW_MEASURE
                ) {
                    View.INVISIBLE
                } else {
                    View.VISIBLE
                }

            reticleLoading.visibility = View.INVISIBLE
            snapPointButton.isEnabled = true
            snapPointButton.alpha = 1f

            val reticleTint = when (quality) {
                HitQuality.PLANE -> android.graphics.Color.rgb(246, 201, 69)
                HitQuality.DEPTH -> android.graphics.Color.rgb(91, 160, 104)
                HitQuality.FEATURE_POINT -> android.graphics.Color.rgb(224, 112, 96)
                HitQuality.INSTANT_PLACEMENT -> android.graphics.Color.WHITE
                null -> android.graphics.Color.rgb(246, 201, 69)
            }
            centerReticle.setColorFilter(reticleTint, PorterDuff.Mode.SRC_IN)

            val dotColor = when (quality) {
                HitQuality.PLANE -> android.graphics.Color.rgb(91, 160, 104)
                HitQuality.DEPTH -> android.graphics.Color.rgb(246, 201, 69)
                HitQuality.FEATURE_POINT -> android.graphics.Color.rgb(224, 112, 96)
                HitQuality.INSTANT_PLACEMENT -> android.graphics.Color.rgb(141, 174, 150)
                null -> android.graphics.Color.rgb(141, 174, 150)
            }
            (confidenceDot.background as? GradientDrawable)?.setColor(dotColor)
        } else {
            centerReticle.visibility = View.INVISIBLE
            reticleLoading.visibility = View.VISIBLE
            snapPointButton.isEnabled = false
            snapPointButton.alpha = 0.45f
            (confidenceDot.background as? GradientDrawable)?.setColor(
                android.graphics.Color.rgb(58, 87, 72)
            )
        }
    }

    private fun getSceneViewOrNull(): ArSceneView? {
        return try {
            arFragment.arSceneView
        } catch (_: Exception) {
            null
        }
    }

    private fun vibrateSuccess() {
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(
                VibrationEffect.createOneShot(
                    35,
                    VibrationEffect.DEFAULT_AMPLITUDE
                )
            )
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(35)
        }
    }

    override fun onDestroy() {
        reticleRunnable?.let {
            reticleHandler.removeCallbacks(it)
        }

        removePlantPreview()
        removePlacedPlant()
        removeSecondPointPreview()
        removeWindowPreview()
        removePreviewLine()
        removeFinalLine()

        super.onDestroy()
    }
}