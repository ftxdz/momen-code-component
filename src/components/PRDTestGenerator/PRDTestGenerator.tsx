import { useState, useEffect, useCallback } from 'react';
import {
  Input,
  Button,
  Upload,
  Card,
  List,
  Modal,
  message,
  Spin,
  Typography,
  Space,
} from 'antd';
import {
  SendOutlined,
  PictureOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { useAppContext } from 'zvm-code-context';
import { useFileUpload } from '../ChatRoom/hooks/useFileUpload';
import { useStreamingMessage } from '../ChatRoom/hooks/useStreamingMessage';
import { GQL_ANALYZE_PRD, GQL_GENERATE_TEST_CASES } from './graphql';
import {
  parseCurl,
  replaceMindContent,
  sendHttpRequest,
  validateFeishuCurl,
} from './feishuUtils';
import styles from './PRDTestGenerator.module.css';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

// 功能需求接口定义
interface FunctionalRequirement {
  id: string;
  description: string;
  usageFlow: string;
  inputRules: string[];
  doubts: string[];
  priority: number;
  testScenarios?: {
    normalCases: string[];
    boundaryCases: string[];
    exceptionCases: string[];
  };
  additionalInfo?: string; // 用户补充的信息
  testCasesGenerated?: boolean; // 是否已生成测试用例
}

// PRD拆解结果接口
interface PRDResult {
  projectBackground: {
    testObject: string;
    projectName: string;
  };
  functionalRequirements: FunctionalRequirement[];
}

export interface PRDTestGeneratorPropData {}

export interface PRDTestGeneratorStateData {}

export interface PRDTestGeneratorEvent {}

// 组件Props接口
export interface PRDTestGeneratorProps {
  propData: PRDTestGeneratorPropData;
  propState: PRDTestGeneratorStateData;
  event: PRDTestGeneratorEvent;
}

/**
 * PRD测试用例生成器组件
 * 功能包括：
 * 1. PRD输入和图片上传
 * 2. 调用AI拆解PRD
 * 3. 显示功能需求列表，支持编辑补充信息
 * 4. 单个和批量生成测试用例
 * 5. 飞书CURL替换和发送
 */
export function PRDTestGenerator({}: PRDTestGeneratorProps) {
  // 基础状态
  const [prdText, setPrdText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [prdResult, setPrdResult] = useState<PRDResult | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  // 飞书相关状态
  const [feishuCurl, setFeishuCurl] = useState<string>('');
  const [isSendingToFeishu, setIsSendingToFeishu] = useState<boolean>(false);

  // 测试用例生成状态
  const [generatingTestCases, setGeneratingTestCases] = useState<Set<string>>(
    new Set()
  );
  const [batchGenerating, setBatchGenerating] = useState<boolean>(false);

  // 使用自定义Hooks
  const context = useAppContext();
  const { query } = context || {};

  // 调试信息
  useEffect(() => {
    console.log('PRDTestGenerator Context:', context);
    console.log('PRDTestGenerator Query function:', query);
    console.log('Query type:', typeof query);
  }, [context, query]);
  const { uploadedImages, handleFileChange, removeImage } = useFileUpload();
  const { streamingMessageTemp, isStreaming, setIsStreaming } =
    useStreamingMessage();

  /**
   * 显示错误信息
   */
  const showError = (errorMessage: string) => {
    Modal.error({
      title: '错误',
      content: errorMessage,
    });
  };

  /**
   * 显示成功信息
   */
  const showSuccess = (successMessage: string) => {
    message.success(successMessage);
  };

  /**
   * 拆解PRD的AI接口调用
   */
  const analyzePRD = useCallback(async () => {
    if (!prdText.trim() && uploadedImages.length === 0) {
      showError('请输入PRD内容或上传图片');
      return;
    }

    if (!query || typeof query !== 'function') {
      console.log(
        'Query function not available, using mock data for demonstration'
      );

      // 使用模拟数据进行演示
      setIsAnalyzing(true);
      setIsStreaming(true);

      // 模拟流式处理
      setTimeout(() => {
        const mockResult: PRDResult = {
          projectBackground: {
            testObject: '示例产品',
            projectName: 'PRD测试项目',
          },
          functionalRequirements: [
            {
              id: 'req-1',
              description: '用户登录功能：用户可以通过用户名和密码登录系统',
              usageFlow:
                '1. 用户访问登录页面\n2. 输入用户名和密码\n3. 点击登录按钮\n4. 系统验证用户信息\n5. 登录成功跳转到主页',
              inputRules: [
                '用户名不能为空',
                '密码长度至少6位',
                '用户名格式正确',
              ],
              doubts: [],
              priority: 1,
              testScenarios: {
                normalCases: ['正确用户名密码登录'],
                boundaryCases: ['密码长度刚好6位'],
                exceptionCases: ['用户名不存在', '密码错误'],
              },
              additionalInfo: '',
              testCasesGenerated: false,
            },
            {
              id: 'req-2',
              description: '商品搜索功能：用户可以根据关键词搜索商品',
              usageFlow:
                '1. 用户在搜索框输入关键词\n2. 点击搜索按钮\n3. 系统返回搜索结果\n4. 用户浏览搜索结果',
              inputRules: ['搜索关键词不能为空', '关键词长度不超过100字符'],
              doubts: [],
              priority: 2,
              testScenarios: {
                normalCases: ['搜索存在的商品'],
                boundaryCases: ['搜索关键词长度为100字符'],
                exceptionCases: ['搜索关键词为空', '搜索不存在的商品'],
              },
              additionalInfo: '',
              testCasesGenerated: false,
            },
          ],
        };

        setPrdResult(mockResult);
        setIsAnalyzing(false);
        setIsStreaming(false);
        showSuccess('演示模式：PRD拆解完成');
      }, 2000);
      return;
    }

    try {
      setIsAnalyzing(true);
      setIsStreaming(true);

      // 构建请求参数
      const inputArgs: any = {
        mgt8q6sp_id: [1020000000000003],
        mh07v0xv: prdText.trim() || 'prd',
      };

      // 如果有图片，添加图片ID
      if (uploadedImages.length > 0) {
        inputArgs.imageIds = uploadedImages.map((img) => img.imageId);
      }

      // 调用拆解PRD的AI接口
      const response = await query(GQL_ANALYZE_PRD, {
        inputArgs,
        zaiConfigId: 'mgt7uxdg',
      });

      if (response.error || response.errors) {
        throw new Error(
          response.error?.message ||
            response.errors?.[0]?.message ||
            'PRD拆解失败'
        );
      }

      const result = response.data?.fz_zai_create_conversation;
      if (result?.conversationId) {
        setConversationId(result.conversationId);
        showSuccess('PRD拆解请求已发送，正在处理中...');
      }
    } catch (error: any) {
      console.error('PRD拆解失败:', error);
      showError(error.message || 'PRD拆解失败');
      setIsAnalyzing(false);
      setIsStreaming(false);
    }
  }, [prdText, uploadedImages, query, setIsStreaming]);

  /**
   * 订阅PRD拆解结果
   * 注意：在实际环境中，这里应该使用 GraphQL 订阅
   */
  useEffect(() => {
    if (!conversationId) return;

    if (!query) {
      console.log('查询功能不可用，跳过PRD拆解结果订阅');
      return;
    }

    // 这里应该实现真正的 GraphQL 订阅
    console.log('PRD拆解结果订阅功能需要在真实环境中实现');
  }, [conversationId, query]);

  /**
   * 更新功能需求的补充信息
   */
  const updateRequirementInfo = useCallback(
    (requirementId: string, additionalInfo: string) => {
      if (!prdResult) return;

      setPrdResult((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          functionalRequirements: prev.functionalRequirements.map((req) =>
            req.id === requirementId ? { ...req, additionalInfo } : req
          ),
        };
      });
    },
    [prdResult]
  );

  /**
   * 订阅测试用例生成结果
   * 注意：在实际环境中，这里应该使用 GraphQL 订阅
   */
  const subscribeTestCasesResult = useCallback(
    (_testConversationId: number, _requirementId: string) => {
      if (!query) {
        console.log('查询功能不可用，跳过测试用例生成结果订阅');
        return;
      }

      // 这里应该实现真正的 GraphQL 订阅
      console.log('测试用例生成结果订阅功能需要在真实环境中实现');
    },
    [query]
  );

  /**
   * 生成单个测试用例
   */
  const generateSingleTestCase = useCallback(
    async (requirement: FunctionalRequirement) => {
      if (!query || typeof query !== 'function') {
        console.log(
          'Query function not available, using mock test case generation'
        );

        // 使用模拟数据进行演示
        setGeneratingTestCases((prev) => new Set(prev).add(requirement.id));

        setTimeout(() => {
          setPrdResult((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              functionalRequirements: prev.functionalRequirements.map((req) =>
                req.id === requirement.id
                  ? { ...req, testCasesGenerated: true }
                  : req
              ),
            };
          });
          showSuccess(
            `演示模式：功能需求"${requirement.description}"的测试用例生成完成`
          );
          setGeneratingTestCases((prev) => {
            const newSet = new Set(prev);
            newSet.delete(requirement.id);
            return newSet;
          });
        }, 1500);
        return;
      }

      try {
        setGeneratingTestCases((prev) => new Set(prev).add(requirement.id));

        const inputArgs = {
          mgua75zg: requirement.description,
          mguamm3k: requirement.usageFlow,
          mguggwms: requirement.inputRules.join(', '),
          mgughlaf: JSON.stringify(requirement.testScenarios || {}),
          mgugl6tt: requirement.additionalInfo || '',
          mguh06no: requirement.inputRules.join(', '),
        };

        const response = await query(GQL_GENERATE_TEST_CASES, {
          inputArgs,
          zaiConfigId: 'mgua6wyt',
        });

        if (response.error || response.errors) {
          throw new Error(
            response.error?.message ||
              response.errors?.[0]?.message ||
              '测试用例生成失败'
          );
        }

        const result = response.data?.fz_zai_create_conversation;
        if (result?.conversationId) {
          // 订阅测试用例生成结果
          subscribeTestCasesResult(result.conversationId, requirement.id);
          showSuccess(
            `功能需求"${requirement.description}"的测试用例生成请求已发送`
          );
        }
      } catch (error: any) {
        console.error('生成测试用例失败:', error);
        showError(error.message || '生成测试用例失败');
      } finally {
        setGeneratingTestCases((prev) => {
          const newSet = new Set(prev);
          newSet.delete(requirement.id);
          return newSet;
        });
      }
    },
    [query, subscribeTestCasesResult]
  );

  /**
   * 批量生成测试用例
   */
  const batchGenerateTestCases = useCallback(async () => {
    if (!prdResult) return;

    const ungeneratedRequirements = prdResult.functionalRequirements.filter(
      (req) => !req.testCasesGenerated
    );

    if (ungeneratedRequirements.length === 0) {
      showSuccess('所有功能需求都已生成测试用例');
      return;
    }

    try {
      setBatchGenerating(true);

      // 并发生成所有未生成的测试用例
      const promises = ungeneratedRequirements.map((req) =>
        generateSingleTestCase(req)
      );
      await Promise.all(promises);

      showSuccess(
        `已为${ungeneratedRequirements.length}个功能需求发送测试用例生成请求`
      );
    } catch (error: any) {
      console.error('批量生成测试用例失败:', error);
      showError(error.message || '批量生成测试用例失败');
    } finally {
      setBatchGenerating(false);
    }
  }, [prdResult, generateSingleTestCase]);

  /**
   * 发送到飞书
   */
  const sendToFeishu = useCallback(async () => {
    if (!feishuCurl.trim()) {
      showError('请输入飞书CURL');
      return;
    }

    if (!prdResult) {
      showError('请先拆解PRD');
      return;
    }

    try {
      setIsSendingToFeishu(true);

      // 验证CURL格式
      if (!validateFeishuCurl(feishuCurl)) {
        showError('CURL格式不正确，请确保包含飞书域名和必要的请求头');
        return;
      }

      // 构建mind_content数据
      const mindContent = JSON.stringify(
        prdResult.functionalRequirements,
        null,
        2
      );

      // 替换CURL中的mind_content
      const updatedCurl = replaceMindContent(feishuCurl, mindContent);

      // 解析更新后的CURL
      const parsedCurl = parseCurl(updatedCurl);
      if (!parsedCurl) {
        showError('CURL解析失败');
        return;
      }

      // 发送HTTP请求
      const response = await sendHttpRequest(parsedCurl);

      if (response.ok) {
        const result = await response.json();
        showSuccess('成功发送到飞书！');
        console.log('飞书响应:', result);
      } else {
        const errorText = await response.text();
        throw new Error(`飞书请求失败: ${response.status} ${errorText}`);
      }
    } catch (error: any) {
      console.error('发送到飞书失败:', error);
      showError(error.message || '发送到飞书失败');
    } finally {
      setIsSendingToFeishu(false);
    }
  }, [feishuCurl, prdResult]);

  return (
    <div className={`${styles.container}`}>
      <Title level={2}>PRD测试用例生成器</Title>

      {/* 开发模式提示 */}
      {(!context || !query) && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              marginBottom: '4px',
              color: '#1890ff',
            }}
          >
            💡 开发模式
          </div>
          <div style={{ color: '#1890ff' }}>
            组件正在演示模式下运行，所有功能将显示模拟数据
          </div>
        </div>
      )}

      {/* PRD输入区域 */}
      <Card title="PRD输入" className={styles.inputCard}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>PRD内容：</Text>
            <TextArea
              value={prdText}
              onChange={(e) => setPrdText(e.target.value)}
              placeholder="请输入PRD内容..."
              rows={6}
              disabled={isAnalyzing}
            />
          </div>

          <div>
            <Text strong>相关图片：</Text>
            <div className={styles.imageUploadArea}>
              {uploadedImages.length > 0 && (
                <div className={styles.imagePreviewArea}>
                  {uploadedImages.map((img, index) => (
                    <div key={img.imageId} className={styles.imagePreviewItem}>
                      <img src={img.previewUrl} alt="预览图片" />
                      <div
                        className={styles.removeImageBtn}
                        onClick={() => removeImage(index)}
                      >
                        <CloseOutlined />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Upload
                showUploadList={false}
                beforeUpload={() => false}
                onChange={handleFileChange}
                accept="image/*"
                multiple={true}
                disabled={isAnalyzing}
              >
                <Button icon={<PictureOutlined />} disabled={isAnalyzing}>
                  上传图片
                </Button>
              </Upload>
            </div>
          </div>

          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={analyzePRD}
            loading={isAnalyzing}
            disabled={isAnalyzing}
            size="large"
          >
            拆解PRD
          </Button>
        </Space>
      </Card>

      {/* PRD拆解结果区域 */}
      {prdResult && (
        <Card title="功能需求列表" className={styles.resultCard}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className={styles.batchActions}>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={batchGenerateTestCases}
                loading={batchGenerating}
                disabled={batchGenerating}
              >
                批量生成测试用例
              </Button>
            </div>

            <List
              dataSource={prdResult.functionalRequirements}
              renderItem={(requirement, index) => (
                <List.Item
                  key={requirement.id}
                  className={styles.requirementItem}
                >
                  <Card size="small" className={styles.requirementCard}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div className={styles.requirementHeader}>
                        <Text strong>需求 {index + 1}</Text>
                        <Text type="secondary">
                          优先级: {requirement.priority}
                        </Text>
                      </div>

                      <div>
                        <Text strong>描述：</Text>
                        <Paragraph>{requirement.description}</Paragraph>
                      </div>

                      {requirement.usageFlow && (
                        <div>
                          <Text strong>使用流程：</Text>
                          <pre className={styles.flowText}>
                            {requirement.usageFlow}
                          </pre>
                        </div>
                      )}

                      <div>
                        <Text strong>补充信息：</Text>
                        <TextArea
                          value={requirement.additionalInfo || ''}
                          onChange={(e) =>
                            updateRequirementInfo(
                              requirement.id,
                              e.target.value
                            )
                          }
                          placeholder="可以在这里补充更多信息..."
                          rows={2}
                        />
                      </div>

                      <div className={styles.requirementActions}>
                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          onClick={() => generateSingleTestCase(requirement)}
                          loading={generatingTestCases.has(requirement.id)}
                          disabled={generatingTestCases.has(requirement.id)}
                        >
                          生成测试用例
                        </Button>
                      </div>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          </Space>
        </Card>
      )}

      {/* 飞书发送区域 */}
      <Card title="发送到飞书" className={styles.feishuCard}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>飞书CURL：</Text>
            <TextArea
              value={feishuCurl}
              onChange={(e) => setFeishuCurl(e.target.value)}
              placeholder="请输入飞书CURL..."
              rows={8}
              disabled={isSendingToFeishu}
            />
          </div>

          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={sendToFeishu}
            loading={isSendingToFeishu}
            disabled={isSendingToFeishu}
            size="large"
          >
            发送到飞书
          </Button>
        </Space>
      </Card>

      {/* 流式消息显示 */}
      {isStreaming && streamingMessageTemp && (
        <Card title="AI处理中..." className={styles.streamingCard}>
          <Spin spinning={isStreaming}>
            <div className={styles.streamingContent}>
              <Text type="secondary">正在处理中，请稍候...</Text>
              <pre className={styles.streamingText}>
                {streamingMessageTemp.content}
              </pre>
            </div>
          </Spin>
        </Card>
      )}
    </div>
  );
}
